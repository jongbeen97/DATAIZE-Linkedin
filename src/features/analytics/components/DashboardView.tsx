'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardTitle, Badge, ErrorState, Skeleton, EmptyState } from '@/shared/ui/primitives';
import { BarChart } from '@/shared/ui/BarChart';
import { SegmentedBar } from '@/shared/ui/SegmentedBar';
import { useToast } from '@/shared/ui/toast';
import { apiCall, hintFor } from '@/shared/lib/http';
import { formatNumber, formatRelative, formatDateTime, truncate } from '@/shared/lib/format';
import { POST_STATUS_LABEL, POST_STATUS_COLOR, POST_STATUSES, type PostStatus } from '@/entities/post';
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
  postPerformance: Array<{
    id: string;
    title: string;
    impressions: number;
    reactions: number;
    leads: number;
    conversionRate: number;
  }>;
}

/**
 * 대시보드.
 *
 * 설계 원칙: 숫자를 나열하는 화면이 아니라,
 * "지금 무엇을 해야 하는가"를 가장 위에서 알려주는 화면으로 구성했습니다.
 *   ① 조치 필요 배너 (실패/예약 건수 → 클릭하면 필터된 목록으로 이동)
 *   ② 상태 분포 막대 + 누적 성과 (범례 클릭 = 필터 이동)
 *   ③ 14일 추이 차트 2종
 *   ④ 게시물별 노출 → 리드 전환 (성과와 유입을 잇는 표)
 *   ⑤ 유입/리드 현황, 최근 게시물
 *
 * 수치 카드를 균등하게 늘어놓지 않은 이유:
 * 모두 같은 크기면 무엇이 중요한지 화면이 말해주지 못합니다.
 * 상태는 비율(막대), 성과는 핵심 2개만 크게 두어 시선 순서를 만들었습니다.
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
    // LinkedIn 에서 원본이 삭제된 글을 발견한 경우, 그 사실을 분명히 알립니다.
    if (removed > 0) {
      toast.error(
        `LinkedIn 에서 삭제된 게시물 ${removed}건을 발견해 'LinkedIn 삭제됨' 으로 표시했습니다. (지표 갱신 ${updated}건)`,
      );
    } else {
      toast.success(
        `지표를 갱신했습니다. (성공 ${updated}건${failed ? `, 실패 ${failed}건` : ''})`,
      );
    }
    void load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
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

      {/* ─────────── ② 상태 분포 + 누적 성과 ───────────
          카드 7개를 늘어놓는 대신 한 줄의 분포 막대로 묶었습니다.
          같은 높이에 '전체 중 얼마'라는 비율 정보가 추가로 담깁니다. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card>
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
              {formatNumber(data.totalPosts)}
            </span>
            <span className="text-xs text-[var(--ink-muted)]">건</span>
          </div>

          <SegmentedBar
            emptyLabel="아직 작성한 게시물이 없습니다."
            segments={POST_STATUSES.map((st) => ({
              key: st,
              label: POST_STATUS_LABEL[st],
              value: data.statusCounts[st],
              color: POST_STATUS_COLOR[st],
              href: `/posts?status=${st}`,
              alert: st === 'FAILED',
            }))}
          />
        </Card>

        <Card>
          <CardTitle
            right={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {/* 데이터 출처를 숨기지 않고 명시한다 */}
                {data.metricsSource === 'sample' ? (
                  <Badge tone="amber">샘플 데이터</Badge>
                ) : (
                  <Badge tone="green">LinkedIn 실연동</Badge>
                )}
                <span className="text-[11px] text-[var(--ink-muted)]">
                  {formatRelative(data.metricsCollectedAt)} 수집
                </span>
                <Button size="sm" loading={refreshing} onClick={() => void handleRefresh()}>
                  새로고침
                </Button>
              </div>
            }
          >
            발행 게시물 성과 (누적)
          </CardTitle>

          {/* 핵심 2개는 크게, 나머지는 작게 — 같은 크기로 6개를 늘어놓으면 위계가 사라집니다 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <HeroMetric label="총 노출" value={formatNumber(data.totals.impressions)} />
            <HeroMetric
              label="참여율"
              value={`${data.totals.engagementRate.toFixed(2)}%`}
              caption="(반응+댓글+공유) / 노출"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--line)] pt-3 sm:grid-cols-4">
            <Metric label="반응" value={formatNumber(data.totals.reactions)} />
            <Metric label="댓글" value={formatNumber(data.totals.comments)} />
            <Metric label="공유" value={formatNumber(data.totals.shares)} />
            <Metric label="링크 클릭" value={formatNumber(data.totals.clicks)} />
          </div>

          {data.metricsSource === 'sample' && (
            <p className="mt-3 rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ink-muted)]">
              위 수치는 실제 LinkedIn 값이 아닙니다. 상세 지표 조회는
              <code className="mx-1 rounded bg-[var(--line)] px-1">r_member_postAnalytics</code>
              권한 승인이 필요하며, 승인 후
              <code className="mx-1 rounded bg-[var(--line)] px-1">METRICS_PROVIDER=linkedin</code>
              으로 바꾸면 코드 수정 없이 실연동으로 전환됩니다.
            </p>
          )}
        </Card>
      </div>

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

      {/* ─────────── ⑤ 게시물별 노출 → 리드 전환 ───────────
          '많이 보였다'와 '고객이 왔다'는 다른 이야기입니다.
          성과 지표(postMetrics)와 유입 현황(leads.referrerPostId)을 이어
          "어떤 글이 실제로 리드를 만들었나"에 답하는 표입니다. */}
      {data.postPerformance.length > 0 && (
        <Card padded={false}>
          <div className="px-5 pt-5">
            <CardTitle
              right={
                <span className="text-[11px] text-[var(--ink-muted)]">전환율 높은 순</span>
              }
            >
              게시물별 성과 — 노출 대비 리드 전환
            </CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[var(--line)] text-[11px] text-[var(--ink-muted)]">
                  <th className="px-5 py-2 text-left font-medium">게시물</th>
                  <th className="px-3 py-2 text-right font-medium">노출</th>
                  <th className="px-3 py-2 text-right font-medium">반응</th>
                  <th className="px-3 py-2 text-right font-medium">유입 리드</th>
                  <th className="px-5 py-2 text-right font-medium">전환율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {data.postPerformance.map((p) => {
                  const best = data.postPerformance[0].conversionRate || 1;
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-2.5">
                        <Link href={`/posts/${p.id}`} className="font-medium hover:underline">
                          {truncate(p.title, 34)}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(p.impressions)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(p.reactions)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(p.leads)}
                      </td>
                      <td className="px-5 py-2.5">
                        {/* 숫자만으로는 비교가 어려워 막대를 함께 둡니다 */}
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[var(--surface-sunken)] sm:block">
                            <div
                              className="h-full rounded-full bg-[var(--color-brand-500)]"
                              style={{ width: `${(p.conversionRate / best) * 100}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-semibold tabular-nums">
                            {p.conversionRate.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─────────── ⑥ 리드 현황 + 최근 게시물 ─────────── */}
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

/** 가장 중요한 수치 — 크게, 그리고 계산식을 함께 보여줍니다 */
function HeroMetric({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-sunken)] px-4 py-3">
      <p className="text-xs text-[var(--ink-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {caption && <p className="mt-0.5 text-[10px] text-[var(--ink-subtle)]">{caption}</p>}
    </div>
  );
}

/** 보조 수치 — 배경 없이 한 줄로 */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 sm:block">
      <p className="text-[11px] text-[var(--ink-muted)]">{label}</p>
      <p className="text-sm font-semibold tabular-nums sm:mt-0.5">{value}</p>
    </div>
  );
}
