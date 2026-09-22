'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardTitle, Badge, ErrorState, Skeleton, EmptyState } from '@/shared/ui/primitives';
import { BarChart } from '@/shared/ui/BarChart';
import { useToast } from '@/shared/ui/toast';
import { apiCall, hintFor } from '@/shared/lib/http';
import { formatNumber, formatRelative, formatDateTime, truncate, cx } from '@/shared/lib/format';
import { POST_STATUS_LABEL, type PostStatus } from '@/entities/post';
import { LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, type LeadSource, type LeadStatus } from '@/entities/lead';
import { StatusBadge } from '@/features/posts/components/StatusBadge';
import { refreshMetrics } from '@/features/posts/api/postsApi';

interface DashboardSummary {
  statusCounts: Record<PostStatus, number>;
  totalPosts: number;
  actionRequired: { failed: number; scheduled: number };
  totals: {
    impressions: number;
    reactions: number;
    comments: number;
    shares: number;
    clicks: number;
    engagementRate: number;
  };
  metricsSource: 'linkedin' | 'sample';
  metricsCollectedAt: string | null;
  dailyPublished: Array<{ date: string; count: number }>;
  dailyLeads: Array<{ date: string; count: number }>;
  leadStatusCounts: Record<LeadStatus, number>;
  leadSourceCounts: Array<{ source: LeadSource; count: number }>;
  recentLeads: Array<{
    id: string;
    name: string;
    email: string;
    company: string | null;
    source: LeadSource;
    status: LeadStatus;
    createdAt: string;
  }>;
  recentPosts: Array<{
    id: string;
    title: string;
    status: PostStatus;
    publishedAt: string | null;
    linkedinUrl: string | null;
    impressions: number | null;
    reactions: number | null;
  }>;
}

/**
 * 대시보드.
 *
 * 설계 원칙: 숫자를 나열하는 화면이 아니라,
 * "지금 무엇을 해야 하는가"를 가장 위에서 알려주는 화면으로 구성했습니다.
 *   ① 조치 필요 배너 (실패/예약 건수 → 클릭하면 필터된 목록으로 이동)
 *   ② 상태별 카드 (각 카드가 필터 링크)
 *   ③ 성과 지표 + 데이터 출처/최신성 표시
 *   ④ 추이 차트, 유입/리드 현황, 최근 게시물
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
    toast.success(
      `지표를 갱신했습니다. (성공 ${res.data.updated}건${res.data.failed ? `, 실패 ${res.data.failed}건` : ''})`,
    );
    void load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) return <Card><ErrorState message={error.message} hint={error.hint} onRetry={() => void load()} /></Card>;
  if (!data) return null;

  const needsAction = data.actionRequired.failed > 0 || data.actionRequired.scheduled > 0;

  return (
    <div className="space-y-4">
      {/* ─────────── ① 가장 먼저 보이는 것: 오늘 해야 할 일 ─────────── */}
      {needsAction ? (
        <Card className="border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                확인이 필요한 항목이 있습니다
              </p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                {data.actionRequired.failed > 0 && `게시 실패 ${data.actionRequired.failed}건`}
                {data.actionRequired.failed > 0 && data.actionRequired.scheduled > 0 && ' · '}
                {data.actionRequired.scheduled > 0 && `예약 대기 ${data.actionRequired.scheduled}건`}
              </p>
            </div>
            <Link href={`/posts?status=${data.actionRequired.failed > 0 ? 'FAILED' : 'SCHEDULED'}`}>
              <Button size="sm" variant="primary">
                확인하러 가기 →
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            현재 조치가 필요한 항목이 없습니다
          </p>
          <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
            실패한 게시물과 대기 중인 예약 건이 모두 없습니다.
          </p>
        </Card>
      )}

      {/* ─────────── ② 상태별 현황 — 각 카드가 목록 필터로 연결된다 ─────────── */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="전체" value={data.totalPosts} href="/posts" />
        {(Object.keys(data.statusCounts) as PostStatus[]).map((s) => (
          <StatCard
            key={s}
            label={POST_STATUS_LABEL[s]}
            value={data.statusCounts[s]}
            href={`/posts?status=${s}`}
            tone={s === 'FAILED' && data.statusCounts[s] > 0 ? 'danger' : 'default'}
          />
        ))}
      </div>

      {/* ─────────── ③ 성과 지표 ─────────── */}
      <Card>
        <CardTitle
          right={
            <div className="flex items-center gap-2">
              {/* 데이터 출처를 숨기지 않고 명시한다 */}
              {data.metricsSource === 'sample' ? (
                <Badge tone="amber">샘플 데이터 · LinkedIn 지표 권한 심사 대기</Badge>
              ) : (
                <Badge tone="green">LinkedIn 실시간 연동</Badge>
              )}
              <span className="text-[11px] text-[var(--ink-muted)]">
                마지막 수집: {formatRelative(data.metricsCollectedAt)}
              </span>
              <Button size="sm" loading={refreshing} onClick={() => void handleRefresh()}>
                지금 새로고침
              </Button>
            </div>
          }
        >
          발행 게시물 성과 (누적)
        </CardTitle>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="노출" value={formatNumber(data.totals.impressions)} />
          <Metric label="반응" value={formatNumber(data.totals.reactions)} />
          <Metric label="댓글" value={formatNumber(data.totals.comments)} />
          <Metric label="공유" value={formatNumber(data.totals.shares)} />
          <Metric label="링크 클릭" value={formatNumber(data.totals.clicks)} />
          <Metric label="참여율" value={`${data.totals.engagementRate.toFixed(2)}%`} />
        </div>

        {data.metricsSource === 'sample' && (
          <p className="mt-3 rounded-lg bg-[var(--canvas)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ink-muted)]">
            위 수치는 실제 LinkedIn 값이 아닙니다. 개인 계정 게시물의 상세 지표 조회는
            <code className="mx-1 rounded bg-[var(--line)] px-1">r_member_postAnalytics</code>
            권한 승인이 필요하며, 승인 후 <code className="mx-1 rounded bg-[var(--line)] px-1">METRICS_PROVIDER=linkedin</code>
            으로 변경하면 코드 수정 없이 실연동으로 전환됩니다.
          </p>
        )}
      </Card>

      {/* ─────────── ④ 추이 ─────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>최근 14일 발행 추이</CardTitle>
          <BarChart data={data.dailyPublished} label="최근 14일 일자별 발행 건수" />
        </Card>
        <Card>
          <CardTitle>최근 14일 신규 유입 (Lead)</CardTitle>
          <BarChart data={data.dailyLeads} label="최근 14일 일자별 신규 리드 수" />
        </Card>
      </div>

      {/* ─────────── ⑤ 리드 현황 + 최근 게시물 ─────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardTitle right={<Link href="/leads" className="text-xs text-[var(--color-brand-600)] hover:underline">전체 보기 →</Link>}>
            유입 경로 / 회원·Lead 현황
          </CardTitle>

          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(data.leadStatusCounts) as LeadStatus[]).map((s) => (
              <span
                key={s}
                className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs"
              >
                {LEAD_STATUS_LABEL[s]}{' '}
                <strong className="tabular-nums">{formatNumber(data.leadStatusCounts[s])}</strong>
              </span>
            ))}
          </div>

          <div className="space-y-1.5">
            {data.leadSourceCounts.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)]">아직 유입 데이터가 없습니다.</p>
            ) : (
              data.leadSourceCounts.map((row) => {
                const max = Math.max(...data.leadSourceCounts.map((r) => r.count), 1);
                return (
                  <div key={row.source} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 text-[var(--ink-muted)]">
                      {LEAD_SOURCE_LABEL[row.source]}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--canvas)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand-500)]"
                        style={{ width: `${(row.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums">{row.count}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="mb-2 text-xs font-semibold">최근 유입</p>
            {data.recentLeads.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)]">
                아직 유입된 리드가 없습니다. <code>npm run seed</code> 로 예시 데이터를 넣을 수 있습니다.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {data.recentLeads.slice(0, 5).map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">
                      <strong className="font-medium">{lead.name}</strong>
                      <span className="text-[var(--ink-muted)]"> · {lead.company ?? '-'}</span>
                    </span>
                    <span className="shrink-0 text-[var(--ink-muted)]">
                      {LEAD_SOURCE_LABEL[lead.source]} · {formatRelative(lead.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5">
            <CardTitle right={<Link href="/posts" className="text-xs text-[var(--color-brand-600)] hover:underline">전체 보기 →</Link>}>
              최근 게시물
            </CardTitle>
          </div>
          {data.recentPosts.length === 0 ? (
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
              {data.recentPosts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/posts/${p.id}`} className="text-sm font-medium hover:underline">
                      {truncate(p.title, 30)}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                      {p.publishedAt ? formatDateTime(p.publishedAt) : '미발행'}
                      {p.impressions !== null && ` · 노출 ${formatNumber(p.impressions)}`}
                      {p.reactions !== null && ` · 반응 ${formatNumber(p.reactions)}`}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  {p.linkedinUrl && (
                    <a
                      href={p.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-brand-600)] hover:underline"
                    >
                      ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ 보조 ------------------------------ */

function StatCard({
  label,
  value,
  href,
  tone = 'default',
}: {
  label: string;
  value: number;
  href: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <Link
      href={href}
      className={cx(
        'rounded-xl border bg-[var(--surface)] p-4 transition hover:border-[var(--color-brand-500)]',
        tone === 'danger' ? 'border-rose-300' : 'border-[var(--line)]',
      )}
    >
      <p className="text-xs text-[var(--ink-muted)]">{label}</p>
      <p
        className={cx(
          'mt-1 text-2xl font-semibold tabular-nums',
          tone === 'danger' && 'text-rose-600',
        )}
      >
        {formatNumber(value)}
      </p>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--canvas)] px-3 py-2.5">
      <p className="text-[11px] text-[var(--ink-muted)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
