import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/shared/config/env';
import { AppError } from '@/shared/lib/api-response';
import type { SessionUser } from '@/entities/user';

/**
 * 세션 처리.
 *
 * 원칙: 쿠키에는 "누구인지"만 담고, LinkedIn 액세스 토큰은 절대 담지 않습니다.
 * 토큰은 DB 에 암호화 저장하고, 서버에서 userId 로 조회해서 씁니다.
 * → 브라우저(=클라이언트)는 토큰을 한 번도 보지 못합니다.
 */

const COOKIE_NAME = 'dz_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

function secret(): Uint8Array {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true, // JS 에서 읽을 수 없음 → XSS 로 탈취 불가
    sameSite: 'lax', // CSRF 완화
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** 로그인 상태가 아니면 null 을 반환 (화면 분기용) */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: String(payload.userId),
      name: String(payload.name),
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
    };
  } catch {
    return null; // 만료/위조 토큰
  }
}

/** API 라우트에서 사용 — 비로그인 시 401 로 통일 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new AppError('UNAUTHORIZED', '로그인이 필요합니다. LinkedIn 계정으로 다시 로그인해 주세요.');
  }
  return session;
}
