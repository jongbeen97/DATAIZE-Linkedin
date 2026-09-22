'use client';

import type { ApiResult, ApiError } from '@/shared/api/contract';

/**
 * 프론트엔드 공용 HTTP 클라이언트.
 *
 * 모든 API 가 동일한 { ok, data | error } 형태를 반환하므로
 * 호출부는 try/catch 없이 result.ok 만 보고 분기할 수 있습니다.
 * 네트워크 단절처럼 응답 자체가 없는 경우도 같은 형태로 변환해 돌려줍니다.
 */
export async function apiCall<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<ApiResult<T>> {
  try {
    const { json, ...rest } = init ?? {};
    const res = await fetch(path, {
      ...rest,
      headers: {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
      body: json ? JSON.stringify(json) : rest.body,
    });

    const text = await res.text();
    if (!text) {
      return {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: '서버가 빈 응답을 반환했습니다.' },
      };
    }
    return JSON.parse(text) as ApiResult<T>;
  } catch {
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버에 연결하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      },
    };
  }
}

/**
 * 에러 코드별 "다음에 무엇을 하면 되는지" 안내.
 * 에러 메시지만 띄우고 끝내면 운영자는 화면 앞에서 멈춰버립니다.
 */
export function hintFor(error: ApiError): string {
  switch (error.code) {
    case 'LINKEDIN_TOKEN_EXPIRED':
    case 'UNAUTHORIZED':
      return '우측 상단의 로그아웃 후 LinkedIn 계정으로 다시 로그인하면 해결됩니다.';
    case 'LINKEDIN_PERMISSION_DENIED':
      return 'LinkedIn 개발자 포털 > Products 에서 "Share on LinkedIn" 승인 상태를 확인해 주세요.';
    case 'LINKEDIN_RATE_LIMITED':
      return 'LinkedIn 은 멤버당 하루 150회로 호출을 제한합니다. 시간을 두고 다시 시도해 주세요.';
    case 'LINKEDIN_BAD_REQUEST':
      return '본문 길이(3,000자)와 특수문자를 확인한 뒤 다시 저장해 주세요.';
    case 'LINKEDIN_UNAVAILABLE':
      return 'LinkedIn 측 일시 장애일 수 있습니다. 잠시 후 [재시도]를 눌러 주세요.';
    case 'ALREADY_PUBLISHED':
      return '이미 발행된 글입니다. 목록에서 LinkedIn 링크로 실제 게시물을 확인할 수 있습니다.';
    case 'INVALID_STATUS_TRANSITION':
      return '목록을 새로고침해 현재 상태를 확인한 뒤 다시 시도해 주세요.';
    case 'VALIDATION_FAILED':
      return '표시된 항목을 수정한 뒤 다시 저장해 주세요.';
    default:
      return '문제가 계속되면 [연동 로그] 화면에서 상세 오류를 확인할 수 있습니다.';
  }
}
