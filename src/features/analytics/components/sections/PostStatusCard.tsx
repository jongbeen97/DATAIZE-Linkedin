'use client';

import Link from 'next/link';
import { Card, CardTitle, SegmentedBar } from '@/shared/ui';
import { formatNumber } from '@/shared/lib/format';
import { POST_STATUSES, POST_STATUS_LABEL, POST_STATUS_COLOR } from '@/entities/post';
import type { DashboardSummary } from '../../model/dashboard';

/**
 * 게시물 상태 현황.
 *
 * 상태마다 카드를 하나씩 두면 6~7개가 늘어서면서 화면 높이만 잡아먹습니다.
 * 한 줄의 누적 막대로 묶으면 높이는 절반이 되고, 대신 "전체 중 얼마"라는
 * 비율 정보가 추가로 생깁니다. 범례를 누르면 해당 상태로 필터된 목록으로 이동합니다.
 */
export function PostStatusCard({
  totalPosts,
  statusCounts,
}: Pick<DashboardSummary, 'totalPosts' | 'statusCounts'>) {
  return (
    <Card className="h-full">
      <CardTitle
        right={
          <Link href="/posts" className="text-xs text-[var(--color-brand-600)] hover:underline">
            전체 보기 →
          </Link>
        }
      >
        게시물 현황
      </CardTitle>

      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatNumber(totalPosts)}
        </span>
        <span className="text-xs text-[var(--ink-muted)]">건</span>
      </div>

      <SegmentedBar
        legend="list"
        emptyLabel="아직 작성한 게시물이 없습니다."
        segments={POST_STATUSES.map((status) => ({
          key: status,
          label: POST_STATUS_LABEL[status],
          value: statusCounts[status],
          color: POST_STATUS_COLOR[status],
          href: `/posts?status=${status}`,
          alert: status === 'FAILED',
        }))}
      />
    </Card>
  );
}
