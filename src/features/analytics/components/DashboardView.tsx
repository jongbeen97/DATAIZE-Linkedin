'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, ErrorState, Skeleton, StatStrip } from '@/shared/ui';
import { useToast } from '@/shared/ui/toast';
import { apiCall, hintFor } from '@/shared/lib/http';
import { formatNumber } from '@/shared/lib/format';
import { POST_STATUS_COLOR } from '@/entities/post';
import { refreshMetrics } from '@/features/posts/api/postsApi';
import type { DashboardSummary } from '../model/dashboard';
import { ActionBanner } from './sections/ActionBanner';
import { PostStatusCard } from './sections/PostStatusCard';
import { PerformanceCard } from './sections/PerformanceCard';
import { TrendCharts } from './sections/TrendCharts';
import { ConversionTable } from './sections/ConversionTable';
import { LeadSummaryCard } from './sections/LeadSummaryCard';
import { RecentPostsCard } from './sections/RecentPostsCard';

/**
 * 대시보드 — 데이터 로딩과 섹션 배치만 담당합니다.
 *
 * 각 섹션의 표현 로직은 sections/ 아래 컴포넌트가 갖고 있어,
 * 이 파일만 읽으면 "화면이 어떤 순서로 무엇을 보여주는가"가 한눈에 보입니다.
 *
 * 배치 원칙: 숫자를 나열하는 화면이 아니라
 * "지금 무엇을 해야 하는가"를 가장 위에서 알려주는 화면으로 구성했습니다.
 *   ① 조치 필요 배너      실패/예약 → 클릭하면 필터된 목록으로
 *   ② 상태 분포 + 누적 성과
 *   ③ 14일 추이 2종
 *   ④ 게시물별 노출 → 리드 전환
 *   ⑤ 유입/리드 현황 + 최근 게시물
 */
export function DashboardView() {
  const toast = useToast();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiCall<DashboardSummary>('/api/analytics/summary');
    setLoading(false);
    if (!res.ok) {
      setError({ message: res.error.message, hint: hintFor(res.error) });
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    const res = await refreshMetrics();
    setRefreshing(false);
    if (!res.ok) {
      toast.error(`${res.error.message} ${hintFor(res.error)}`);
      return;
    }

    const { updated, failed, removed } = res.data;
    // LinkedIn 에서 원본이 삭제된 글을 발견한 경우, 성공이 아니라 경고로 알립니다.
    if (removed > 0) {
      toast.error(
        `LinkedIn 에서 삭제된 게시물 ${removed}건을 발견해 'LinkedIn 삭제됨' 으로 표시했습니다. (지표 갱신 ${updated}건)`,
      );
    } else {
      toast.success(`지표를 갱신했습니다. (성공 ${updated}건${failed ? `, 실패 ${failed}건` : ''})`);
    }
    void load();
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Card>
        <ErrorState message={error.message} hint={error.hint} onRetry={() => void load()} />
      </Card>
    );
  }

  if (!data) return null;

  const newLeads14d = data.dailyLeads.reduce((sum, d) => sum + d.count, 0);
  const totalLeads = Object.values(data.leadStatusCounts).reduce((a, b) => a + b, 0);
  const converted = data.leadStatusCounts.CONVERTED;

  return (
    <div className="space-y-4">
      {/* 노출 · 참여율은 아래 성과 카드에 있으므로, 띠에는 '게시'와 '리드' 규모만 둡니다 */}
      <StatStrip
        stats={[
          {
            key: 'posts',
            label: '전체 게시물',
            value: formatNumber(data.totalPosts),
            caption: `초안 ${formatNumber(data.statusCounts.DRAFT)} · 예약 ${formatNumber(data.statusCounts.SCHEDULED)}`,
            color: 'var(--color-brand-500)',
            href: '/posts',
          },
          {
            key: 'published',
            label: '발행 완료',
            value: formatNumber(data.statusCounts.PUBLISHED),
            caption: `실패 ${formatNumber(data.statusCounts.FAILED)}건`,
            color: POST_STATUS_COLOR.PUBLISHED,
            href: '/posts?status=PUBLISHED',
          },
          {
            key: 'leads14',
            label: '최근 14일 신규 리드',
            value: formatNumber(newLeads14d),
            caption: `누적 ${formatNumber(totalLeads)}명`,
            color: POST_STATUS_COLOR.SCHEDULED,
            href: '/leads',
          },
          {
            key: 'converted',
            label: '전환 리드',
            value: formatNumber(converted),
            caption: `전체 리드 대비 ${totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0.0'}%`,
            color: POST_STATUS_COLOR.PUBLISHED,
            href: '/leads',
          },
        ]}
      />

      <ActionBanner actionRequired={data.actionRequired} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <PostStatusCard totalPosts={data.totalPosts} statusCounts={data.statusCounts} />
        <PerformanceCard
          totals={data.totals}
          metricsSource={data.metricsSource}
          metricsCollectedAt={data.metricsCollectedAt}
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
        />
      </div>

      <TrendCharts dailyPublished={data.dailyPublished} dailyLeads={data.dailyLeads} />

      <ConversionTable rows={data.postPerformance} />

      <div className="grid gap-4 lg:grid-cols-2">
        <LeadSummaryCard
          leadStatusCounts={data.leadStatusCounts}
          leadSourceCounts={data.leadSourceCounts}
          recentLeads={data.recentLeads}
        />
        <RecentPostsCard posts={data.recentPosts} />
      </div>
    </div>
  );
}

/** 실제 레이아웃과 같은 형태로 — 로딩이 끝났을 때 화면이 덜컥 바뀌지 않게 합니다 */
function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}
