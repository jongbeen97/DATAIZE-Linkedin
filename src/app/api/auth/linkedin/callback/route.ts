import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/shared/config/env';
import { exchangeCodeForToken, fetchUserInfo } from '@/server/linkedin/oauth';
import { upsertUserFromLinkedIn, saveAccessToken } from '@/server/repositories/userRepository';
import { createSession } from '@/server/auth/session';
import { ensureIndexes } from '@/server/db/mongo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/linkedin/callback?code=...&state=...
 *
 * LinkedIn 이 사용자를 이 주소로 되돌려 보냅니다.
 *   ① state 대조 (CSRF 방어)
 *   ② code → access_token 교환
 *   ③ /v2/userinfo 로 프로필 조회
 *   ④ 사용자 upsert + 토큰 암호화 저장
 *   ⑤ 세션 쿠키 발급 후 대시보드로 이동
 *
 * 이 라우트는 사용자가 브라우저로 직접 접근하는 화면이므로,
 * 실패 시 JSON 이 아니라 로그인 화면으로 되돌려 보내고 사유를 쿼리로 전달합니다.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const linkedinError = url.searchParams.get('error');
  const linkedinErrorDesc = url.searchParams.get('error_description');

  const redirectToLogin = (reason: string) =>
    NextResponse.redirect(`${env().APP_BASE_URL}/login?error=${encodeURIComponent(reason)}`);

  // 사용자가 동의 화면에서 '취소'를 누른 경우
  if (linkedinError) {
    return redirectToLogin(linkedinErrorDesc ?? 'LinkedIn 인증이 취소되었습니다.');
  }

  // ① state 대조
  const savedState = req.cookies.get('dz_oauth_state')?.value;
  if (!state || !savedState || state !== savedState) {
    return redirectToLogin('인증 요청이 유효하지 않습니다. 다시 로그인해 주세요.');
  }
  if (!code) {
    return redirectToLogin('LinkedIn 인증 코드를 받지 못했습니다.');
  }

  try {
    await ensureIndexes();

    // ② 토큰 교환
    const token = await exchangeCodeForToken(code);

    // ③ 프로필 조회
    const profile = await fetchUserInfo(token.accessToken);

    // ④ 사용자 + 토큰 저장 (토큰은 AES-256-GCM 으로 암호화되어 저장됨)
    const user = await upsertUserFromLinkedIn({
      linkedinSub: profile.sub,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    });
    await saveAccessToken({
      userId: user.id,
      accessToken: token.accessToken,
      expiresInSec: token.expiresInSec,
      scopes: token.scopes,
    });

    // ⑤ 세션 발급
    await createSession({ userId: user.id, name: user.name, avatarUrl: user.avatarUrl });

    const res = NextResponse.redirect(`${env().APP_BASE_URL}/dashboard`);
    res.cookies.delete('dz_oauth_state');
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'LinkedIn 로그인에 실패했습니다.';
    console.error('[oauth/callback]', e);
    return redirectToLogin(message);
  }
}
