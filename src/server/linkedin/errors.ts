import { AppError } from '@/server/http/response';
import type { ApiErrorCode } from '@/shared/api/contract';

/**
 * LinkedIn 의 HTTP 상태코드를 "우리 도메인의 에러"로 번역합니다.
 *
 * 이 번역 계층이 없으면 화면 코드가 401/429 같은 외부 시스템의 사정을
 * 직접 알아야 합니다. 여기서 한 번 번역해 두면
 * 화면은 "재로그인이 필요하다 / 잠시 후 재시도하라"만 알면 됩니다.
 */
export function mapLinkedInError(status: number, body: string): AppError {
  const detail = extractMessage(body);

  const { code, message }: { code: ApiErrorCode; message: string } = (() => {
    switch (status) {
      case 401:
        return {
          code: 'LINKEDIN_TOKEN_EXPIRED' as const,
          message: 'LinkedIn 인증이 만료되었습니다. 우측 상단에서 다시 로그인해 주세요.',
        };
      case 403:
        return {
          code: 'LINKEDIN_PERMISSION_DENIED' as const,
          message:
            'LinkedIn 권한이 부족합니다. 개발자 앱의 Products 에서 해당 권한이 승인되었는지 확인해 주세요.',
        };
      case 422:
      case 400:
        return {
          code: 'LINKEDIN_BAD_REQUEST' as const,
          message: `LinkedIn 이 요청을 거절했습니다. 본문 내용을 확인해 주세요. (${detail})`,
        };
      case 404:
      case 410:
        // 게시물이 LinkedIn 에서 삭제된 경우입니다.
        // 재시도해도 의미가 없으므로 별도 코드로 구분해 상태 정정에 사용합니다.
        return {
          code: 'LINKEDIN_NOT_FOUND' as const,
          message: 'LinkedIn 에서 해당 게시물을 찾을 수 없습니다. 이미 삭제된 것으로 보입니다.',
        };
      case 429:
        return {
          code: 'LINKEDIN_RATE_LIMITED' as const,
          message:
            'LinkedIn 호출 한도를 초과했습니다. 멤버당 하루 150회 제한이 있으며, 잠시 후 다시 시도해 주세요.',
        };
      default:
        if (status >= 500) {
          return {
            code: 'LINKEDIN_UNAVAILABLE' as const,
            message: 'LinkedIn 서버가 일시적으로 응답하지 않습니다. 잠시 후 재시도해 주세요.',
          };
        }
        return {
          code: 'LINKEDIN_BAD_REQUEST' as const,
          message: `LinkedIn 호출에 실패했습니다. (HTTP ${status}: ${detail})`,
        };
    }
  })();

  return new AppError(code, message, { status, body: body.slice(0, 500) });
}

function extractMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string; serviceErrorCode?: number };
    return parsed.message ?? body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

/** 재시도해도 의미가 있는 에러인지 (일시적 장애 / 한도 초과만 재시도) */
export function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}
