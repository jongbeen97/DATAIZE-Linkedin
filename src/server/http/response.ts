import { NextResponse } from 'next/server';
import {
  HTTP_STATUS_BY_ERROR_CODE,
  type ApiErrorCode,
  type ApiResult,
} from '@/shared/api/contract';

/**
 * Route Handler 가 응답을 만드는 도구 모음. **서버 전용입니다.**
 * (계약 타입은 shared/api/contract.ts — 프론트도 그쪽을 import 합니다)
 */

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, { status });
}

export function fail(code: ApiErrorCode, message: string, details?: unknown) {
  return NextResponse.json<ApiResult<never>>(
    { ok: false, error: { code, message, details } },
    { status: HTTP_STATUS_BY_ERROR_CODE[code] },
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
