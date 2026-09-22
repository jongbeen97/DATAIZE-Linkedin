'use client';

import { Badge, Button, Card, CardTitle } from '@/shared/ui';
import { formatNumber, formatRelative } from '@/shared/lib/format';
import type { DashboardSummary } from '../../model/dashboard';

/**
 * 누적 성과 지표.
 *
 * 6개를 같은 크기로 늘어놓으면 무엇이 중요한지 화면이 말해주지 못합니다.
 * 총 노출과 참여율만 크게 두고 나머지는 한 줄로 내려 시선 순서를 만들었습니다.
 * 데이터 출처(실연동/샘플)와 수집 시점을 항상 함께 노출합니다.
 */
export function PerformanceCard({
  totals,
  metricsSource,
  metricsCollectedAt,
  refreshing,
  onRefresh,
}: Pick<DashboardSummary, 'totals' | 'metricsSource' | 'metricsCollectedAt'> & {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardTitle
        right={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* 데이터 출처를 숨기지 않고 명시한다 */}
            {metricsSource === 'sample' ? (
              <Badge tone="amber">샘플 데이터</Badge>
            ) : (
              <Badge tone="green">LinkedIn 실연동</Badge>
            )}
            <span className="text-[11px] text-[var(--ink-muted)]">
              {formatRelative(metricsCollectedAt)} 수집
            </span>
            <Button size="sm" loading={refreshing} onClick={onRefresh}>
              새로고침
            </Button>
          </div>
        }
      >
        발행 게시물 성과 (누적)
      </CardTitle>

      <div className="grid gap-4 sm:grid-cols-2">
        <HeroMetric label="총 노출" value={formatNumber(totals.impressions)} />
        <HeroMetric
          label="참여율"
          value={`${totals.engagementRate.toFixed(2)}%`}
          caption="(반응+댓글+공유) / 노출"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--line)] pt-3 sm:grid-cols-4">
        <Metric label="반응" value={formatNumber(totals.reactions)} />
        <Metric label="댓글" value={formatNumber(totals.comments)} />
        <Metric label="공유" value={formatNumber(totals.shares)} />
        <Metric label="링크 클릭" value={formatNumber(totals.clicks)} />
      </div>

      {metricsSource === 'sample' && (
        <p className="mt-3 rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ink-muted)]">
          위 수치는 실제 LinkedIn 값이 아닙니다. 상세 지표 조회는
          <code className="mx-1 rounded bg-[var(--line)] px-1">r_member_postAnalytics</code>
          권한 승인이 필요하며, 승인 후
          <code className="mx-1 rounded bg-[var(--line)] px-1">METRICS_PROVIDER=linkedin</code>
          으로 바꾸면 코드 수정 없이 실연동으로 전환됩니다.
        </p>
      )}
    </Card>
  );
}

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
