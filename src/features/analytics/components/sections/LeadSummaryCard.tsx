'use client';

import Link from 'next/link';
import { Card, CardTitle } from '@/shared/ui';
import { formatNumber, formatRelative } from '@/shared/lib/format';
import { LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, type LeadStatus } from '@/entities/lead';
import type { DashboardSummary } from '../../model/dashboard';

/**
 * 유입 경로 / 회원·Lead 현황.
 *
 * 상태별 건수(칩) → 유입 경로 분포(막대) → 최근 유입 목록 순으로,
 * 요약에서 개별 건으로 좁혀지도록 배치했습니다.
 */
export function LeadSummaryCard({
  leadStatusCounts,
  leadSourceCounts,
  recentLeads,
}: Pick<DashboardSummary, 'leadStatusCounts' | 'leadSourceCounts' | 'recentLeads'>) {
  const maxSource = Math.max(...leadSourceCounts.map((r) => r.count), 1);

  return (
    <Card>
      <CardTitle
        right={
          <Link href="/leads" className="text-xs text-[var(--color-brand-600)] hover:underline">
            전체 보기 →
          </Link>
        }
      >
        유입 경로 / 회원·Lead 현황
      </CardTitle>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(leadStatusCounts) as LeadStatus[]).map((status) => (
          <span key={status} className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs">
            {LEAD_STATUS_LABEL[status]}{' '}
            <strong className="tabular-nums">{formatNumber(leadStatusCounts[status])}</strong>
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {leadSourceCounts.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">아직 유입 데이터가 없습니다.</p>
        ) : (
          leadSourceCounts.map((row) => (
            <div key={row.source} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-[var(--ink-muted)]">
                {LEAD_SOURCE_LABEL[row.source]}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                <div
                  className="h-full rounded-full bg-[var(--color-brand-500)]"
                  style={{ width: `${(row.count / maxSource) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums">{row.count}</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-3">
        <p className="mb-2 text-xs font-semibold">최근 유입</p>
        {recentLeads.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">
            아직 유입된 리드가 없습니다. <code>npm run seed</code> 로 예시 데이터를 넣을 수 있습니다.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {recentLeads.slice(0, 5).map((lead) => (
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
  );
}
