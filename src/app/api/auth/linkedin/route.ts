import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, createState } from '@/server/linkedin/oauth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/linkedin
 * 사용자를 LinkedIn 동의 화면으로 보냅니다.
 *
 * state 를 쿠키에 저장했다가 콜백에서 대조합니다 → CSRF 방어.
 * (공격자가 임의로 만든 콜백 요청은 이 쿠키를 만들 수 없습니다)
 */
export async function GET() {
  const state = createState();

  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  res.cookies.set('dz_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10분
  });
  return res;
}
