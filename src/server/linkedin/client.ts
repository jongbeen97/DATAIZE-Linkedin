import { env } from '@/shared/config/env';
import { AppError } from '@/server/http/response';
import { findAccessToken } from '@/server/repositories/userRepository';
import { writeApiCallLog } from '@/server/repositories/apiLogRepository';
import { mapLinkedInError, isRetryable } from './errors';

const API_BASE = 'https://api.linkedin.com';

export interface LinkedInResponse<T> {
  data: T;
  /** 생성 API 는 본문 대신 이 헤더로 URN 을 돌려준다 */
  restliId: string | null;
  status: number;
}

/**
 * LinkedIn API 호출 공통 클라이언트.
 *
 * 이 한 곳에 아래 5가지가 모두 들어 있습니다.
 *   ① 저장된 토큰 자동 주입 + 만료 검사
 *   ② LinkedIn 필수 헤더 자동 부착
 *   ③ 실패 시 도메인 에러로 번역
 *   ④ 일시적 오류(429/5xx)만 지수 백오프 재시도
 *   ⑤ 모든 호출을 DB 에 로그로 남겨 운영자가 화면에서 확인 가능
 *
 * 개별 API 함수(posts.ts 등)는 "무엇을 호출할지"만 신경 쓰면 됩니다.
 */
export async function linkedinFetch<T>(options: {
  userId: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: unknown;
  /** REST(/rest/*) 는 LinkedIn-Version 헤더가 필수, 구형(/v2/*) 은 불필요 */
  useVersionHeader?: boolean;
  maxRetries?: number;
}): Promise<LinkedInResponse<T>> {
  const { userId, method, path, body, useVersionHeader = true, maxRetries = 2 } = options;

  const stored = await findAccessToken(userId);
  if (!stored) {
    throw new AppError(
      'LINKEDIN_TOKEN_EXPIRED',
      'LinkedIn 연동 정보가 없습니다. LinkedIn 계정으로 다시 로그인해 주세요.',
    );
  }
  if (stored.isExpired) {
    throw new AppError(
      'LINKEDIN_TOKEN_EXPIRED',
      'LinkedIn 액세스 토큰이 만료되었습니다. 다시 로그인해 주세요.',
    );
  }

  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startedAt = Date.now();
    let status: number | null = null;
    let responseText = '';

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${stored.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          ...(useVersionHeader ? { 'LinkedIn-Version': env().LINKEDIN_API_VERSION } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });

      status = res.status;
      responseText = await res.text();

      if (!res.ok) {
        const error = mapLinkedInError(res.status, responseText);
        await writeApiCallLog({
          userId,
          method,
          endpoint: path,
          statusCode: status,
          durationMs: Date.now() - startedAt,
          success: false,
          errorCode: error.code,
          requestSummary: body ? JSON.stringify(body) : null,
          responseSummary: responseText,
        });

        if (isRetryable(res.status) && attempt < maxRetries) {
          lastError = error;
          await sleep(2 ** attempt * 1000); // 1s → 2s
          continue;
        }
        throw error;
      }

      await writeApiCallLog({
        userId,
        method,
        endpoint: path,
        statusCode: status,
        durationMs: Date.now() - startedAt,
        success: true,
        errorCode: null,
        requestSummary: body ? JSON.stringify(body) : null,
        responseSummary: responseText || '(빈 본문)',
      });

      return {
        data: (responseText ? JSON.parse(responseText) : {}) as T,
        restliId: res.headers.get('x-restli-id'),
        status: res.status,
      };
    } catch (e) {
      if (e instanceof AppError) throw e;

      // fetch 자체가 실패 (네트워크 단절 등)
      const error = new AppError(
        'LINKEDIN_UNAVAILABLE',
        'LinkedIn 에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.',
        { cause: e instanceof Error ? e.message : String(e) },
      );
      await writeApiCallLog({
        userId,
        method,
        endpoint: path,
        statusCode: status,
        durationMs: Date.now() - startedAt,
        success: false,
        errorCode: error.code,
        requestSummary: body ? JSON.stringify(body) : null,
        responseSummary: e instanceof Error ? e.message : String(e),
      });

      if (attempt < maxRetries) {
        lastError = error;
        await sleep(2 ** attempt * 1000);
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new AppError('LINKEDIN_UNAVAILABLE', 'LinkedIn 호출에 실패했습니다.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
