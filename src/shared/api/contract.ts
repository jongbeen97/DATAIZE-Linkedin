/**
 * 프론트엔드와 백엔드가 공유하는 API 계약.
 *
 * 이 파일에는 **런타임 의존성이 전혀 없습니다.** 순수 타입과 상수뿐이라
 * 브라우저 번들에 들어가도 안전하고, 서버 코드가 딸려오지 않습니다.
 * (응답을 실제로 만드는 코드는 server/http/response.ts 에 있습니다)
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface ApiError {
  code: ApiErrorCode;
  message: string; // 사용자에게 그대로 보여줄 수 있는 한국어 문구
  details?: unknown; // 검증 실패 필드 등 부가 정보
}

/** 에러 코드 체계 — 화면에서 코드별로 다른 대응(재로그인/재시도/수정)을 안내한다 */
export const API_ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'INVALID_STATUS_TRANSITION',
  'ALREADY_PUBLISHED',
  'LINKEDIN_TOKEN_EXPIRED',
  'LINKEDIN_PERMISSION_DENIED',
  'LINKEDIN_RATE_LIMITED',
  'LINKEDIN_NOT_FOUND',
  'LINKEDIN_BAD_REQUEST',
  'LINKEDIN_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** 에러 코드 → HTTP 상태코드. 코드를 추가하면 여기서 컴파일 에러가 납니다 */
export const HTTP_STATUS_BY_ERROR_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INVALID_STATUS_TRANSITION: 409,
  ALREADY_PUBLISHED: 409,
  LINKEDIN_TOKEN_EXPIRED: 401,
  LINKEDIN_PERMISSION_DENIED: 403,
  LINKEDIN_RATE_LIMITED: 429,
  LINKEDIN_NOT_FOUND: 404,
  LINKEDIN_BAD_REQUEST: 422,
  LINKEDIN_UNAVAILABLE: 502,
  INTERNAL_ERROR: 500,
};
