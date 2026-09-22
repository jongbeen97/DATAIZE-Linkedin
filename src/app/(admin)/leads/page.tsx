import Link from 'next/link';
import { Card, CardTitle, Badge, EmptyState } from '@/shared/ui/primitives';
import { formatDateTime, formatNumber } from '@/shared/lib/format';
import { listRecentLeads, countLeadsByStatus, countLeadsBySource } from '@/server/repositories/leadRepository';
import { LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, type LeadStatus } from '@/entities/lead';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<LeadStatus, 'neutral' | 'blue' | 'violet' | 'green' | 'rose'> = {
  NEW: 'blue',
  CONTACTED: 'violet',
  QUALIFIED: 'neutral',
  CONVERTED: 'green',
  LOST: 'rose',
};

export default async function LeadsPage() {
  const [leads, statusCounts, sourceCounts] = await Promise.all([
    listRecentLeads(50),
    countLeadsByStatus(),
    countLeadsBySource(),
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        {(Object.keys(statusCounts) as LeadStatus[]).map((s) => (
          <Card key={s}>
            <p className="text-xs text-[var(--ink-muted)]">{LEAD_STATUS_LABEL[s]}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(statusCounts[s])}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>유입 경로별 분포</CardTitle>
        {sourceCounts.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">아직 유입 데이터가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {sourceCounts.map((row) => {
              const max = Math.max(...sourceCounts.map((r) => r.count), 1);
              return (
                <div key={row.source} className="flex items-center gap-3 text-xs">
                  <span className="w-24 shrink-0 text-[var(--ink-muted)]">
                    {LEAD_SOURCE_LABEL[row.source]}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--canvas)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-brand-500)]"
                      style={{ width: `${(row.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums">{formatNumber(row.count)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardTitle>최근 유입 리드</CardTitle>
        </div>

        {leads.length === 0 ? (
          <EmptyState
            title="아직 유입된 리드가 없습니다"
            description="LinkedIn 게시물을 통해 랜딩으로 들어온 방문자가 리드로 기록됩니다. 화면 확인을 위해 예시 데이터를 넣으려면 터미널에서 npm run seed 를 실행하세요."
            action={
              <Link
                href="/posts/new"
                className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline"
              >
                게시물 작성하러 가기 →
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--ink-muted)]">
                  <th className="px-5 py-3 font-medium">이름</th>
                  <th className="px-3 py-3 font-medium">이메일</th>
                  <th className="px-3 py-3 font-medium">회사</th>
                  <th className="px-3 py-3 font-medium">유입 경로</th>
                  <th className="px-3 py-3 font-medium">상태</th>
                  <th className="px-5 py-3 font-medium">유입 시각</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--canvas)]">
                    <td className="px-5 py-3 font-medium">{lead.name}</td>
                    <td className="px-3 py-3 text-xs text-[var(--ink-muted)]">{lead.email}</td>
                    <td className="px-3 py-3 text-xs">{lead.company ?? '-'}</td>
                    <td className="px-3 py-3 text-xs">{LEAD_SOURCE_LABEL[lead.source]}</td>
                    <td className="px-3 py-3">
                      <Badge tone={STATUS_TONE[lead.status]}>{LEAD_STATUS_LABEL[lead.status]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap text-[var(--ink-muted)]">
                      {formatDateTime(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
