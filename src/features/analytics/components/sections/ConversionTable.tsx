'use client';

import Link from 'next/link';
import { Card, CardTitle } from '@/shared/ui';
import { formatNumber, truncate } from '@/shared/lib/format';
import type { DashboardPostPerformance } from '../../model/dashboard';

/**
 * 게시물별 노출 → 리드 전환.
 *
 * 성과 지표(postMetrics)와 유입 현황(leads.referrerPostId)을 이어 만듭니다.
 * 둘을 따로 보여주면 "많이 보였다"까지만 알 수 있고,
 * "그 글이 실제로 고객을 데려왔는가"에는 답하지 못합니다.
 * 노출 1위가 전환율 1위가 아니라는 점이 이 표의 존재 이유입니다.
 */
export function ConversionTable({ rows }: { rows: DashboardPostPerformance[] }) {
  if (rows.length === 0) return null;

  // 막대는 절대값이 아니라 1위 대비 비율로 그립니다 (전환율은 보통 1% 미만이라)
  const best = rows[0].conversionRate || 1;

  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <CardTitle right={<span className="text-[11px] text-[var(--ink-muted)]">전환율 높은 순</span>}>
          게시물별 성과 — 노출 대비 리드 전환
        </CardTitle>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[var(--line)] bg-[var(--table-head)] text-xs text-[var(--ink)]">
              <th className="px-5 py-2 text-left font-semibold">게시물</th>
              <th className="px-3 py-2 text-right font-semibold">노출</th>
              <th className="px-3 py-2 text-right font-semibold">반응</th>
              <th className="px-3 py-2 text-right font-semibold">유입 리드</th>
              <th className="px-5 py-2 text-right font-semibold">전환율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-2.5">
                  <Link href={`/posts/${row.id}`} className="font-medium hover:underline">
                    {truncate(row.title, 34)}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatNumber(row.impressions)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatNumber(row.reactions)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(row.leads)}</td>
                <td className="px-5 py-2.5">
                  {/* 숫자만으로는 비교가 어려워 막대를 함께 둡니다 */}
                  <div className="flex items-center justify-end gap-2">
                    <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[var(--surface-sunken)] sm:block">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand-500)]"
                        style={{ width: `${(row.conversionRate / best) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-semibold tabular-nums">
                      {row.conversionRate.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
