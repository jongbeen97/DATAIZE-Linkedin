/**
 * 연동 로그를 "사람이 읽는 문장"으로 바꿉니다.
 *
 * 로그 원문(HTTP 403, {"serviceErrorCode":100,...})은 개발자에게는 충분하지만
 * 운영 담당자에게는 "그래서 뭐가 문제고 내가 뭘 해야 하는가"가 보이지 않습니다.
 *
 * 같은 오류 코드라도 **어떤 작업에서 났는지**에 따라 뜻이 달라서, 코드 하나만 보고
 * 번역하지 않고 (작업, 오류) 조합으로 설명을 고릅니다.
 *   - 403 이 '게시'에서 나면  → 게시 권한 문제 (지금 당장 게시가 안 됨)
 *   - 403 이 '지표 조회'에서 나면 → 성과 조회 권한 미승인 (게시는 정상)
 *   - 404 가 '삭제'에서 나면  → 이미 지워진 글 (문제 아님)
 *
 * 문구에 작업 이름을 끼워 넣지 않습니다. "'반응 · 댓글 수 조회'이" 처럼
 * 받침에 따라 조사가 틀어지기 때문입니다. 작업 이름은 화면이 따로 보여줍니다.
 *
 * DB · 네트워크를 모르는 순수 함수라 selftest 로 검증합니다.
 */

export type LogAction = 'publish' | 'unpublish' | 'analytics' | 'socialMetadata' | 'unknown';

export const LOG_ACTION_LABEL: Record<LogAction, string> = {
  publish: '게시물 발행',
  unpublish: 'LinkedIn 게시물 삭제',
  analytics: '노출 · 도달 지표 조회',
  socialMetadata: '반응 · 댓글 수 조회',
  unknown: 'LinkedIn 요청',
};

/** HTTP 메서드와 경로로 "무슨 작업이었는지"를 판별합니다 */
export function classifyLogAction(method: string, endpoint: string): LogAction {
  const m = method.toUpperCase();
  const path = endpoint.split('?')[0];
  if (path === '/rest/posts' && m === 'POST') return 'publish';
  if (path.startsWith('/rest/posts/') && m === 'DELETE') return 'unpublish';
  if (path.startsWith('/rest/memberCreatorPostAnalytics')) return 'analytics';
  if (path.startsWith('/rest/socialMetadata/')) return 'socialMetadata';
  return 'unknown';
}

/**
 * 실패의 무게 — 운영자가 해야 할 일 기준.
 *  - action: 직접 무언가 해야 해결됨
 *  - wait:   기다렸다 다시 하면 됨 (일시 장애 · 한도)
 *  - info:   기록상 실패지만 할 일은 없음
 */
export type LogSeverity = 'action' | 'wait' | 'info';

export interface LogExplanation {
  severity: LogSeverity;
  /** 한 줄 요약 — 목록에 그대로 보입니다 */
  summary: string;
  /** 왜 그런가 */
  cause: string;
  /** 무엇을 하면 되나 */
  fix: string;
}

const isMetrics = (a: LogAction) => a === 'analytics' || a === 'socialMetadata';

export function explainFailure(input: {
  method: string;
  endpoint: string;
  errorCode: string | null;
  statusCode: number | null;
  responseSummary?: string | null;
}): LogExplanation {
  const action = classifyLogAction(input.method, input.endpoint);

  switch (input.errorCode) {
    case 'LINKEDIN_TOKEN_EXPIRED':
      return {
        severity: 'action',
        summary: 'LinkedIn 로그인이 만료되었습니다',
        cause: '로그인한 지 오래되어 LinkedIn이 요청을 거절했습니다.',
        fix: '로그아웃한 뒤 다시 로그인하세요. 실패한 게시물은 목록에서 [재시도]를 누르면 다시 올라갑니다.',
      };

    case 'LINKEDIN_PERMISSION_DENIED':
      if (isMetrics(action)) {
        return {
          severity: 'info',
          summary: '성과 지표를 볼 권한이 아직 없습니다',
          cause:
            'LinkedIn에서 성과 지표를 받으려면 별도 승인이 필요한데, 아직 승인을 받지 못했습니다. 게시와 삭제는 정상적으로 됩니다.',
          fix: '지금 따로 하실 일은 없습니다. 실제 지표가 필요하면 개발 담당자에게 권한 신청을 부탁하세요.',
        };
      }
      return {
        severity: 'action',
        summary: 'LinkedIn에 게시할 권한이 없습니다',
        cause: '로그인할 때 게시 권한에 동의하지 않았거나, 앱에서 게시 권한이 꺼져 있습니다.',
        fix: '다시 로그인하면서 권한 요청을 모두 허용하세요. 그래도 안 되면 개발 담당자에게 알려 주세요.',
      };

    case 'LINKEDIN_NOT_FOUND':
      if (action === 'unpublish') {
        return {
          severity: 'info',
          summary: '이미 LinkedIn에서 지워진 글입니다',
          cause: 'LinkedIn에서 직접 지웠거나 앞서 삭제한 글이라 지울 대상이 없었습니다.',
          fix: "따로 하실 일은 없습니다. 관리자 페이지에는 'LinkedIn 삭제됨'으로 표시되고, 성과와 리드 기록은 그대로 남습니다.",
        };
      }
      if (isMetrics(action)) {
        return {
          severity: 'info',
          summary: '삭제된 글이라 지표를 가져오지 못했습니다',
          cause: '지표를 조회하려던 글이 LinkedIn에 더 이상 없습니다.',
          fix: "따로 하실 일은 없습니다. 다음에 지표를 새로고침하면 'LinkedIn 삭제됨'으로 바뀝니다.",
        };
      }
      return {
        severity: 'action',
        summary: 'LinkedIn에서 대상을 찾지 못했습니다',
        cause: '요청한 대상이 LinkedIn에 없습니다.',
        fix: '게시물 목록을 새로고침해 지금 상태를 확인하세요.',
      };

    case 'LINKEDIN_RATE_LIMITED':
      return {
        severity: 'wait',
        summary: '오늘 LinkedIn 호출 한도를 넘었습니다',
        cause: 'LinkedIn은 계정마다 하루에 보낼 수 있는 요청 수를 약 150회로 제한합니다.',
        fix: '몇 시간 뒤나 내일 다시 시도하세요. 지표 새로고침을 자주 누르면 한도가 금방 찹니다.',
      };

    case 'LINKEDIN_UNAVAILABLE':
      return {
        severity: 'wait',
        summary: 'LinkedIn 서버에 연결하지 못했습니다',
        cause: 'LinkedIn 쪽의 일시 장애나 네트워크 문제입니다. 설정은 바꾸지 않아도 됩니다.',
        fix: '몇 분 뒤 다시 시도하세요. 게시하던 중이었다면 목록에서 [재시도]를 누르면 됩니다.',
      };

    case 'LINKEDIN_BAD_REQUEST': {
      const detail = extractLinkedInMessage(input.responseSummary);
      return {
        severity: 'action',
        summary: 'LinkedIn이 요청을 거절했습니다',
        cause: `요청 내용 중에 LinkedIn이 받아들이지 않는 부분이 있습니다.${detail ? ` (LinkedIn 메시지: ${detail})` : ''}`,
        fix:
          action === 'publish'
            ? '본문이 3,000자를 넘지 않는지, 특수문자나 링크에 문제가 없는지 확인하고 [재시도]를 누르세요.'
            : '같은 일이 되풀이되면 원문을 개발 담당자에게 전달하세요.',
      };
    }

    default:
      return {
        severity: 'action',
        summary: '요청이 실패했습니다',
        cause: `예상하지 못한 응답을 받았습니다.${input.statusCode ? ` (HTTP ${input.statusCode})` : ''}`,
        fix: '잠시 뒤 다시 시도하세요. 되풀이되면 원문을 개발 담당자에게 전달하세요.',
      };
  }
}

/** LinkedIn 오류 응답 JSON 에서 message 만 꺼냅니다 (없으면 null) */
function extractLinkedInMessage(body: string | null | undefined): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : null;
  } catch {
    return null;
  }
}
