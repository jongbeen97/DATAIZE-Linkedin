import { Card, CardTitle, Badge, EmptyState, PageHeader, StatStrip, type BadgeTone } from '@/shared/ui';
import { cx, formatDate, formatNumber } from '@/shared/lib/format';
import { requireSession } from '@/server/auth/session';
import { listApiCallLogs, type ApiCallLog } from '@/server/repositories/apiLogRepository';
import {
  LOG_ACTION_LABEL,
  classifyLogAction,
  explainFailure,
  type LogExplanation,
  type LogSeverity,
} from '@/features/logs/model/describeLog';

export const dynamic = 'force-dynamic';

/**
 * 결과 뱃지 — 실패를 한 가지로 뭉뚱그리지 않고 '운영자가 할 일' 기준으로 나눕니다.
 * 실패한 요청에 '문제 없음'을 붙이면 모순처럼 읽혀서, 할 일이 없는 실패는 '참고'로 둡니다.
 */
const SEVERITY_BADGE: Record<LogSeverity, { tone: BadgeTone; label: string }> = {
  action: { tone: 'rose', label: '확인 필요' },
  wait: { tone: 'amber', label: '일시 오류' },
  info: { tone: 'neutral', label: '참고' },
};

const SEVERITY_TEXT: Record<LogSeverity, string> = {
  action: 'text-rose-700 dark:text-rose-300',
  wait: 'text-amber-700 dark:text-amber-300',
  info: 'text-[var(--ink-muted)]',
};

/**
 * 연동 로그 화면.
 *
 * 운영 담당자가 "게시가 왜 실패했지?"를 개발자에게 묻지 않고 직접 확인할 수 있어야
 * 실제 운영이 돌아갑니다. 그래서 오류 코드 대신 한 줄 요약을 먼저 보여주고,
 * 원인 · 해결 방법 · 원문은 [자세히]로 펼쳐 봅니다.
 * 직접 조치가 필요한 항목만 처음부터 펼쳐 둡니다.
 */
export default async function LogsPage() {
  const session = await requireSession();
  const logs = await listApiCallLogs(session.userId, 100);

  const rows = logs.map((log) => ({
    log,
    action: classifyLogAction(log.method, log.endpoint),
    explanation: log.success ? null : explainFailure(log),
  }));

  const count = (s: LogSeverity) => rows.filter((r) => r.explanation?.severity === s).length;
  const succeeded = rows.filter((r) => r.log.success).length;
  const needsAction = count('action');
  const infoOnly = count('info');

  return (
    <>
      <PageHeader
        crumbs={[{ label: '연동 로그' }]}
        title="연동 로그"
        description="LinkedIn과 주고받은 요청 기록입니다. 실패한 요청은 원인과 해결 방법을 함께 보여 줍니다."
      />

      <StatStrip
        stats={[
          {
            key: 'total',
            label: '최근 요청',
            value: formatNumber(logs.length),
            caption: '최근 100건까지 · 30일 뒤 자동 삭제',
            color: 'var(--color-brand-500)',
          },
          {
            key: 'ok',
            label: '성공',
            value: formatNumber(succeeded),
            caption:
              logs.length > 0 ? `전체의 ${Math.round((succeeded / logs.length) * 100)}%` : '기록 없음',
            color: 'var(--status-published)',
          },
          {
            key: 'action',
            label: '확인 필요',
            value: formatNumber(needsAction),
            caption: needsAction > 0 ? '아래에서 해결 방법을 확인하세요' : '처리할 일이 없습니다',
            color: 'var(--status-failed)',
          },
          {
            key: 'info',
            label: '참고',
            value: formatNumber(infoOnly),
            caption: '실패로 남았지만 할 일은 없습니다',
            color: 'var(--status-draft)',
          },
        ]}
      />

      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardTitle>요청 기록</CardTitle>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            title="아직 요청 기록이 없습니다"
            description="LinkedIn에 게시하거나 지표를 새로고침하면 여기에 기록이 쌓입니다."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] table-fixed text-sm">
              <thead>
                <tr className="bg-[var(--table-head)] text-left text-[13px] text-[var(--ink)]">
                  <th className="w-32 px-5 py-3 font-semibold">결과</th>
                  <th className="px-3 py-3 font-semibold">작업</th>
                  <th className="w-24 px-3 py-3 font-semibold">소요</th>
                  <th className="w-36 px-5 py-3 font-semibold">시각</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ log, action, explanation }) => (
                  <tr
                    key={log.id}
                    className="border-t border-[var(--line)] align-top transition-colors hover:bg-[var(--surface-sunken)]/60"
                  >
                    <td className="px-5 py-3">
                      {explanation ? (
                        <Badge tone={SEVERITY_BADGE[explanation.severity].tone} dot>
                          {SEVERITY_BADGE[explanation.severity].label}
                        </Badge>
                      ) : (
                        <Badge tone="green" dot>
                          성공
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold" title={`${log.method} ${log.endpoint}`}>
                        {LOG_ACTION_LABEL[action]}
                      </p>
                      {explanation ? (
                        <Detail log={log} explanation={explanation} />
                      ) : (
                        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">정상 처리되었습니다</p>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-muted)] tabular-nums">
                      {formatNumber(log.durationMs)}ms
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <p className="tabular-nums">{formatDate(log.createdAt)}</p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)] tabular-nums">
                        {new Date(log.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
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
    </>
  );
}

/** 한 줄 요약 + [자세히] — 목록의 행 높이를 고르게 유지합니다 */
function Detail({ log, explanation }: { log: ApiCallLog; explanation: LogExplanation }) {
  return (
    <details open={explanation.severity === 'action'} className="group mt-0.5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs select-none [&::-webkit-details-marker]:hidden">
        <span className={SEVERITY_TEXT[explanation.severity]}>{explanation.summary}</span>
        <span className="shrink-0 text-[var(--ink-subtle)] underline-offset-2 group-open:hidden hover:underline">
          자세히
        </span>
        <span className="hidden shrink-0 text-[var(--ink-subtle)] underline-offset-2 group-open:inline hover:underline">
          접기
        </span>
      </summary>

      <div
        className={cx(
          'mt-2 max-w-3xl space-y-1.5 rounded-lg border-l-2 bg-[var(--surface-sunken)] py-2.5 pr-3 pl-3.5 text-[13px] leading-relaxed',
          explanation.severity === 'action'
            ? 'border-rose-400'
            : explanation.severity === 'wait'
              ? 'border-amber-400'
              : 'border-[var(--line-strong)]',
        )}
      >
        <p>
          <span className="mr-1.5 font-semibold">원인</span>
          <span className="text-[var(--ink-muted)]">{explanation.cause}</span>
        </p>
        <p>
          <span className="mr-1.5 font-semibold">해결</span>
          <span className="text-[var(--ink-muted)]">{explanation.fix}</span>
        </p>

        {/* 원문은 지우지 않고 한 번 더 접어 둡니다 — 개발 담당자에게 그대로 전달할 수 있도록 */}
        <details className="pt-1">
          <summary className="cursor-pointer text-xs text-[var(--ink-subtle)] select-none hover:text-[var(--ink-muted)]">
            개발자용 원문
          </summary>
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed break-all text-[var(--ink-muted)]">
            {log.method} {log.endpoint}
            <br />
            HTTP {log.statusCode ?? '-'} · {log.errorCode ?? '-'}
            {log.responseSummary && (
              <>
                <br />
                {log.responseSummary}
              </>
            )}
          </p>
        </details>
      </div>
    </details>
  );
}
