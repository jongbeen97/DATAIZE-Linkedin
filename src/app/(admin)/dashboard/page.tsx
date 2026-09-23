import Link from 'next/link';
import { Button, IconPlus, PageHeader } from '@/shared/ui';
import { DashboardView } from '@/features/analytics/components/DashboardView';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Home' }]}
        title="Home"
        description="발행 상태, 누적 성과, 유입 리드를 한눈에 보고 지금 처리할 일을 확인합니다."
        actions={
          <>
            <Link href="/posts">
              <Button>게시물 관리</Button>
            </Link>
            <Link href="/posts/new">
              <Button variant="primary">
                <IconPlus />새 게시물
              </Button>
            </Link>
          </>
        }
      />
      <DashboardView />
    </>
  );
}
