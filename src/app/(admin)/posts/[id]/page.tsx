import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardTitle, Badge, Button } from '@/shared/ui/primitives';
import { formatDateTime, formatNumber, formatRelative } from '@/shared/lib/format';
import { requireSession } from '@/server/auth/session';
import { findPostById } from '@/server/repositories/postRepository';
import { findLatestMetrics } from '@/server/repositories/metricsRepository';
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
  if (isEditable(post.status)) {
    return (
      <div className="space-y-4">
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

  const metrics = await findLatestMetrics(post.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardTitle right={<StatusBadge status={post.status} />}>{post.title}</CardTitle>

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
            <Button variant="ghost">목록으로</Button>
          </Link>
          {post.linkedinUrl && (
            <a href={post.linkedinUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary">LinkedIn 에서 보기 ↗</Button>
            </a>
          )}
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
              <MetricRow label="노출" value={formatNumber(metrics.impressions)} />
              <MetricRow label="도달" value={formatNumber(metrics.membersReached)} />
              <MetricRow label="반응" value={formatNumber(metrics.reactions)} />
              <MetricRow label="댓글" value={formatNumber(metrics.comments)} />
              <MetricRow label="공유" value={formatNumber(metrics.shares)} />
              <MetricRow label="링크 클릭" value={formatNumber(metrics.clicks)} />
            </dl>
            <p className="mt-3 text-[11px] text-[var(--ink-muted)]">
              마지막 수집: {formatRelative(metrics.collectedAt)}
            </p>
          </>
        )}
      </Card>
    </div>
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

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 last:border-0">
      <dt className="text-xs text-[var(--ink-muted)]">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
