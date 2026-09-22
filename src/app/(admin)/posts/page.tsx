import { Suspense } from 'react';
import Link from 'next/link';
import { Button, Skeleton } from '@/shared/ui/primitives';
import { PostListView } from '@/features/posts/components/PostListView';

export const dynamic = 'force-dynamic';

export default function PostsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-[var(--ink-muted)]">
            작성한 게시물의 상태와 성과를 확인하고, LinkedIn 에 발행합니다.
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            발행된 글은 <span className="text-[var(--ink)]">[LinkedIn에서 삭제]</span> 로 실제
            게시물까지 내릴 수 있습니다. 성과·리드 기록은 보존됩니다.
          </p>
        </div>
        <Link href="/posts/new">
          <Button variant="primary">+ 새 게시물</Button>
        </Link>
      </div>

      {/* useSearchParams 를 쓰는 클라이언트 컴포넌트는 Suspense 경계가 필요합니다 */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PostListView />
      </Suspense>
    </div>
  );
}
