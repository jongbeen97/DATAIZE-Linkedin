import { NextResponse } from 'next/server';

/**
 * 모든 API 응답의 형태를 하나로 통일합니다.
 * 프론트는 ok 플래그만 보고 분기하고, 실패 시 error.code 로
 * 사용자에게 보여줄 안내 문구를 결정합니다.
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

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
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

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, { status });
}

export function fail(code: ApiErrorCode, message: string, details?: unknown) {
  return NextResponse.json<ApiResult<never>>(
    { ok: false, error: { code, message, details } },
    { status: STATUS_BY_CODE[code] },
  );
}

/** 도메인/외부 API 에러를 API 응답으로 옮기기 위한 공통 에러 타입 */
export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Route Handler 를 감싸서 예외를 일관된 응답으로 변환합니다.
 * (Spring 의 @RestControllerAdvice + @ExceptionHandler 와 같은 역할)
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof AppError) {
        return fail(e.code, e.message, e.details);
      }
      console.error('[UNHANDLED]', e);
      const message = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
      return fail('INTERNAL_ERROR', message);
    }
  };
}
