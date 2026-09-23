import Link from 'next/link';
import { Card, CardTitle, Badge, EmptyState, PageHeader, StatStrip } from '@/shared/ui';
import { formatDate, formatNumber } from '@/shared/lib/format';
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

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const conversion = total > 0 ? (statusCounts.CONVERTED / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[{ label: '유입 · Lead' }]}
        title="유입 · Lead"
        description="LinkedIn 게시물을 통해 들어온 방문자와 리드의 진행 상황을 봅니다."
      />

      <StatStrip
        stats={[
          {
            key: 'total',
            label: '전체 리드',
            value: formatNumber(total),
            caption: `접촉 ${formatNumber(statusCounts.CONTACTED)} · 검증 ${formatNumber(statusCounts.QUALIFIED)}`,
            color: 'var(--color-brand-500)',
          },
          {
            key: 'new',
            label: '신규',
            value: formatNumber(statusCounts.NEW),
            caption: '아직 연락하지 않은 리드',
            color: 'var(--status-scheduled)',
          },
          {
            key: 'converted',
            label: '전환',
            value: formatNumber(statusCounts.CONVERTED),
            caption: `전체 대비 ${conversion.toFixed(1)}%`,
            color: 'var(--status-published)',
          },
          {
            key: 'lost',
            label: '이탈',
            value: formatNumber(statusCounts.LOST),
            caption: '진행이 중단된 리드',
            color: 'var(--status-failed)',
          },
        ]}
      />

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
          <CardTitle
            right={
              <span className="text-xs text-[var(--ink-muted)]">최근 {formatNumber(leads.length)}건</span>
            }
          >
            최근 유입 리드
          </CardTitle>
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
                <tr className="bg-[var(--table-head)] text-left text-[13px] text-[var(--ink)]">
                  <th className="px-5 py-3 font-semibold">이름</th>
                  <th className="px-3 py-3 font-semibold">회사</th>
                  <th className="px-3 py-3 font-semibold">유입 경로</th>
                  <th className="px-3 py-3 font-semibold">상태</th>
                  <th className="px-5 py-3 font-semibold">유입일</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t border-[var(--line)] transition-colors hover:bg-[var(--surface-sunken)]"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-brand-50)] text-xs font-semibold text-[var(--color-brand-700)] dark:bg-[var(--color-brand-700)]/25 dark:text-[var(--color-brand-400)]"
                        >
                          {lead.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold">{lead.name}</p>
                          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{lead.company ?? '-'}</td>
                    <td className="px-3 py-3">
                      <p>{LEAD_SOURCE_LABEL[lead.source]}</p>
                      {/* 어떤 게시물을 보고 들어왔는지 연결된 경우에만 표시합니다 */}
                      {lead.referrerPostId && (
                        <p className="mt-0.5 text-xs text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">
                          게시물 경유
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={STATUS_TONE[lead.status]} dot>
                        {LEAD_STATUS_LABEL[lead.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="tabular-nums">{formatDate(lead.createdAt)}</p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)] tabular-nums">
                        {new Date(lead.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </p>
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
