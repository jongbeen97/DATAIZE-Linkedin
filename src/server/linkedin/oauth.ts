import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { env } from '@/shared/config/env';
import { AppError } from '@/shared/lib/api-response';

/**
 * LinkedIn OAuth 2.0 (Authorization Code Grant) + OpenID Connect
 *
 * 흐름:
 *   ① /authorize 로 사용자를 보냄 (state 로 CSRF 방어)
 *   ② 사용자가 승인하면 우리 콜백으로 code 가 돌아옴
 *   ③ code 를 access_token 으로 교환 (서버 ↔ 서버, client_secret 사용)
 *   ④ /v2/userinfo 로 프로필과 sub(계정 식별자) 조회 → personUrn 생성
 */

const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

/**
 * 요청할 권한 범위.
 *  - openid / profile / email : "Sign In with LinkedIn using OpenID Connect" 제품
 *  - w_member_social          : "Share on LinkedIn" 제품 (실제 게시에 필수)
 */
export const LINKEDIN_SCOPES = ['openid', 'profile', 'email', 'w_member_social'] as const;

export function createState(): string {
  return randomBytes(16).toString('hex');
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env().LINKEDIN_CLIENT_ID,
    redirect_uri: env().LINKEDIN_REDIRECT_URI,
    state,
    scope: LINKEDIN_SCOPES.join(' '),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/* ------------------------- ③ 토큰 교환 ------------------------- */

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
});

export interface ExchangedToken {
  accessToken: string;
  expiresInSec: number;
  scopes: string[];
}

export async function exchangeCodeForToken(code: string): Promise<ExchangedToken> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env().LINKEDIN_REDIRECT_URI,
      client_id: env().LINKEDIN_CLIENT_ID,
      client_secret: env().LINKEDIN_CLIENT_SECRET,
    }),
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new AppError(
      'LINKEDIN_BAD_REQUEST',
      `LinkedIn 토큰 교환에 실패했습니다. Redirect URI 와 Client Secret 을 확인해 주세요. (HTTP ${res.status})`,
      { body: text.slice(0, 500) },
    );
  }

  // 외부 응답도 반드시 스키마로 검증한다 (경계에서의 검증)
  const parsed = tokenResponseSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new AppError('LINKEDIN_BAD_REQUEST', 'LinkedIn 토큰 응답 형식이 예상과 다릅니다.', {
      issues: parsed.error.issues,
    });
  }

  return {
    accessToken: parsed.data.access_token,
    expiresInSec: parsed.data.expires_in,
    scopes: parsed.data.scope?.split(/[\s,]+/).filter(Boolean) ?? [...LINKEDIN_SCOPES],
  };
}

/* ------------------------- ④ 프로필 조회 ------------------------- */

const userInfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  email: z.string().email().optional(),
  picture: z.string().url().optional(),
});

export interface LinkedInProfile {
  sub: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  /** 게시 API 의 author 필드에 그대로 사용 */
  personUrn: string;
}

export async function fetchUserInfo(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new AppError(
      'LINKEDIN_PERMISSION_DENIED',
      `LinkedIn 프로필 조회에 실패했습니다. 'Sign In with LinkedIn using OpenID Connect' 제품이 승인되었는지 확인해 주세요. (HTTP ${res.status})`,
      { body: text.slice(0, 500) },
    );
  }

  const parsed = userInfoSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new AppError('LINKEDIN_BAD_REQUEST', 'LinkedIn 프로필 응답 형식이 예상과 다릅니다.');
  }

  const d = parsed.data;
  const name =
    d.name ?? [d.given_name, d.family_name].filter(Boolean).join(' ') ?? 'LinkedIn User';

  return {
    sub: d.sub,
    name: name || 'LinkedIn User',
    email: d.email ?? null,
    avatarUrl: d.picture ?? null,
    personUrn: `urn:li:person:${d.sub}`,
  };
}
