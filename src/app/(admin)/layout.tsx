import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';
import { AdminShell } from '@/features/auth/components/AdminShell';

export const dynamic = 'force-dynamic';

/**
 * 관리자 영역 전체의 인증 가드.
 * 이 레이아웃 아래의 모든 페이지는 로그인 없이 접근할 수 없습니다.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return <AdminShell user={session}>{children}</AdminShell>;
}
