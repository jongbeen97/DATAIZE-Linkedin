import { NextResponse } from 'next/server';
import { destroySession } from '@/server/auth/session';
import { env } from '@/shared/config/env';

export const dynamic = 'force-dynamic';

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true, data: { redirectTo: `${env().APP_BASE_URL}/login` } });
}
