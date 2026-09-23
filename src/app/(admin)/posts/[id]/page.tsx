import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardTitle, Badge, Button, Sparkline, Delta, IconExternal, PageHeader } from '@/shared/ui';
import { formatDateTime, formatNumber, formatRelative } from '@/shared/lib/format';
import { requireSession } from '@/server/auth/session';
import { findPostById } from '@/server/repositories/postRepository';
import { findLatestMetrics, findMetricsHistory } from '@/server/repositories/metricsRepository';
import { countLeadsByPostIds } from '@/server/repositories/leadRepository';
import { isEditable } from '@/entities/post';
import { PostEditor } from '@/features/posts/components/PostEditor';
import { StatusBadge } from '@/features/posts/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const post = await findPostById(session.userId, id);
  if (!post) notFound();

  // 수정 가능한 상태면 에디터를, 이미 발행된 글이면 읽기 전용 상세를 보여준다
  const crumbs = [{ label: 'SNS 게시물', href: '/posts' }, { label: post.title }];

  if (isEditable(post.status)) {
    return (
      <div className="space-y-4">
        <PageHeader
          crumbs={crumbs}
          title={
            <span className="flex flex-wrap items-center gap-3">
              게시물 수정 <StatusBadge status={post.status} />
            </span>
          }
          description="발행 전 게시물은 내용과 예약 시각을 고칠 수 있습니다."
        />
        {post.status === 'FAILED' && post.failReason && (
          <Card className="border-rose-300 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/40">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              이전 발행 시도가 실패했습니다
            </p>
            <p className="mt-1 text-xs leading-relaxed text-rose-800 dark:text-rose-300">
              {post.failReason}
            </p>
            <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
              오류 코드: {post.failCode ?? '-'} · 시도 횟수: {post.publishAttempts}회
            </p>
          </Card>
        )}
        <PostEditor initial={post} />
      </div>
    );
  }

  // 최신값만이 아니라 누적된 스냅샷 이력과 유입 리드까지 함께 읽습니다.
  const [metrics, history, leadCounts] = await Promise.all([
    findLatestMetrics(post.id),
    findMetricsHistory(post.id),
    countLeadsByPostIds([post.id]),
  ]);
  const leads = leadCounts.get(post.id) ?? 0;
  const previous = history.length >= 2 ? history[history.length - 2] : null;
  // 노출 대비 리드 전환율 — '많이 보였다'와 '고객이 왔다'는 다른 이야기입니다
  const conversionRate =
    metrics && metrics.impressions > 0 ? (leads / metrics.impressions) * 100 : 0;

  return (
    <>
    <PageHeader
      crumbs={crumbs}
      title={
        <span className="flex flex-wrap items-center gap-3">
          {post.title} <StatusBadge status={post.status} />
        </span>
      }
      description={`${formatDateTime(post.publishedAt)} 발행 · ${post.visibility === 'PUBLIC' ? '전체 공개' : '1촌 공개'}`}
      actions={
        post.linkedinUrl ? (
          <a href={post.linkedinUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="primary">
              LinkedIn 에서 보기 <IconExternal size={14} />
            </Button>
          </a>
        ) : undefined
      }
    />
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardTitle>본문</CardTitle>

        <div className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>

        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <Row label="발행 시각" value={formatDateTime(post.publishedAt)} />
          <Row label="공개 범위" value={post.visibility === 'PUBLIC' ? '전체 공개' : '1촌만'} />
          <Row label="LinkedIn URN" value={post.linkedinUrn ?? '-'} mono />
          <Row label="발행 시도 횟수" value={`${post.publishAttempts}회`} />
        </dl>

        <div className="mt-5 flex gap-2 border-t border-[var(--line)] pt-4">
          <Link href="/posts">
            <Button>목록으로</Button>
          </Link>
        </div>
      </Card>

      <Card className="h-fit">
        <CardTitle
          right={
            metrics ? (
              <Badge tone={metrics.source === 'linkedin' ? 'green' : 'amber'}>
                {metrics.source === 'linkedin' ? 'LinkedIn 실연동' : '샘플'}
              </Badge>
            ) : undefined
          }
        >
          성과 지표
        </CardTitle>

        {!metrics ? (
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
            아직 수집된 지표가 없습니다. 대시보드에서 [지금 새로고침]을 눌러 수집할 수 있습니다.
          </p>
        ) : (
          <>
            <dl className="space-y-2 text-sm">
              <MetricRow
                label="노출"
                value={formatNumber(metrics.impressions)}
                delta={previous ? metrics.impressions - previous.impressions : 0}
              />
              <MetricRow
                label="도달"
                value={formatNumber(metrics.membersReached)}
                delta={previous ? metrics.membersReached - previous.membersReached : 0}
              />
              <MetricRow
                label="반응"
                value={formatNumber(metrics.reactions)}
                delta={previous ? metrics.reactions - previous.reactions : 0}
              />
              <MetricRow label="댓글" value={formatNumber(metrics.comments)} />
              <MetricRow label="공유" value={formatNumber(metrics.shares)} />
              <MetricRow label="링크 클릭" value={formatNumber(metrics.clicks)} />
            </dl>

            {/* 이 글이 실제로 고객을 데려왔는가 — 노출수만으로는 답할 수 없는 질문 */}
            <div className="mt-4 rounded-lg bg-[var(--surface-sunken)] p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[var(--ink-muted)]">유입 리드</span>
                <span className="text-lg font-semibold tabular-nums">{formatNumber(leads)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs text-[var(--ink-muted)]">노출 대비 전환율</span>
                <span className="text-sm font-semibold tabular-nums">
                  {conversionRate.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* 수집 이력이 2건 이상 쌓였을 때만 추이를 보여줍니다 */}
            {history.length >= 2 && (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-xs text-[var(--ink-muted)]">노출 추이</span>
                  <span className="text-[10px] text-[var(--ink-subtle)]">
                    {history.length}회 수집
                  </span>
                </div>
                <Sparkline values={history.map((h) => h.impressions)} label="노출 추이" />
                <div className="mt-1 flex justify-between text-[10px] text-[var(--ink-subtle)] tabular-nums">
                  <span>{formatNumber(history[0].impressions)}</span>
                  <span>{formatNumber(history[history.length - 1].impressions)}</span>
                </div>
              </div>
            )}

            <p className="mt-3 text-[11px] text-[var(--ink-muted)]">
              마지막 수집: {formatRelative(metrics.collectedAt)}
            </p>
          </>
        )}
      </Card>
    </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[var(--ink-muted)]">{label}</dt>
      <dd className={mono ? 'mt-0.5 font-mono text-[11px] break-all' : 'mt-0.5'}>{value}</dd>
    </div>
  );
}

function MetricRow({ label, value, delta = 0 }: { label: string; value: string; delta?: number }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 last:border-0">
      <dt className="text-xs text-[var(--ink-muted)]">{label}</dt>
      <dd className="flex items-baseline gap-1.5">
        <Delta value={delta} className="text-[10px] font-medium tabular-nums" />
        <span className="font-semibold tabular-nums">{value}</span>
      </dd>
    </div>
  );
}
