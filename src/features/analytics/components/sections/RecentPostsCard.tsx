'use client';

import Link from 'next/link';
import { Button, Card, CardTitle, EmptyState } from '@/shared/ui';
import { formatDateTime, formatNumber, truncate } from '@/shared/lib/format';
import { StatusBadge } from '@/features/posts/components/StatusBadge';
import type { DashboardRecentPost } from '../../model/dashboard';

/**
 * 최근 게시물.
 *
 * 비어 있을 때 "없습니다"로 끝내지 않고 [첫 게시물 작성하기] 버튼을 함께 둡니다.
 * 빈 화면은 막다른 길이 되기 쉬워, 항상 다음 행동을 제시합니다.
 */
export function RecentPostsCard({ posts }: { posts: DashboardRecentPost[] }) {
  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <CardTitle
          right={
            <Link href="/posts" className="text-xs text-[var(--color-brand-600)] hover:underline">
              전체 보기 →
            </Link>
          }
        >
          최근 게시물
        </CardTitle>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="아직 게시물이 없습니다"
          description="첫 게시물을 작성하면 여기에 최근 활동이 표시됩니다."
          action={
            <Link href="/posts/new">
              <Button size="sm" variant="primary">
                첫 게시물 작성하기
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/posts/${post.id}`} className="text-sm font-medium hover:underline">
                  {truncate(post.title, 30)}
                </Link>
                <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                  {post.publishedAt ? formatDateTime(post.publishedAt) : '미발행'}
                  {post.impressions !== null && ` · 노출 ${formatNumber(post.impressions)}`}
                  {post.reactions !== null && ` · 반응 ${formatNumber(post.reactions)}`}
                </p>
              </div>
              <StatusBadge status={post.status} />
              {post.linkedinUrl && (
                <a
                  href={post.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-brand-600)] hover:underline"
                  aria-label="LinkedIn 에서 보기"
                >
                  ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
