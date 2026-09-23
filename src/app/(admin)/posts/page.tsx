import { Suspense } from 'react';
import Link from 'next/link';
import { Button, IconPlus, PageHeader, Skeleton } from '@/shared/ui';
import { PostListView } from '@/features/posts/components/PostListView';

export const dynamic = 'force-dynamic';

export default function PostsPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'SNS 게시물' }]}
        title="SNS 게시물"
        description="작성한 게시물의 상태와 성과를 확인하고 LinkedIn 에 발행합니다."
        actions={
          <Link href="/posts/new">
            <Button variant="primary">
              <IconPlus />새 게시물
            </Button>
          </Link>
        }
      />

      {/* useSearchParams 를 쓰는 클라이언트 컴포넌트는 Suspense 경계가 필요합니다 */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PostListView />
      </Suspense>
    </>
  );
}
