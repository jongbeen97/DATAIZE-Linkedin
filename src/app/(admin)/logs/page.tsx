import { Card, CardTitle, Badge, EmptyState } from '@/shared/ui/primitives';
import { formatDateTime } from '@/shared/lib/format';
import { requireSession } from '@/server/auth/session';
import { listApiCallLogs } from '@/server/repositories/apiLogRepository';

export const dynamic = 'force-dynamic';

/**
 * 연동 로그 화면.
 *
 * 이 화면이 존재하는 이유:
 * 운영 담당자가 "게시가 왜 실패했지?"를 개발자에게 묻지 않고
 * 직접 확인할 수 있어야 실제 운영이 돌아가기 때문입니다.
 * 모든 LinkedIn API 호출의 요청/응답/소요시간/에러코드가 여기에 남습니다.
 */
export default async function LogsPage() {
  const session = await requireSession();
  const logs = await listApiCallLogs(session.userId, 100);

  return (
    <Card padded={false}>
      <div className="px-5 pt-5">
        <CardTitle
          right={<span className="text-[11px] text-[var(--ink-muted)]">최근 100건 · 30일 후 자동 삭제</span>}
        >
          LinkedIn API 호출 기록
        </CardTitle>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="아직 호출 기록이 없습니다"
          description="LinkedIn 으로 게시하거나 지표를 수집하면 모든 요청과 응답이 여기에 기록됩니다."
        />
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {logs.map((log) => (
            <li key={log.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={log.success ? 'green' : 'rose'} dot>
                  {log.success ? '성공' : '실패'}
                </Badge>
                <code className="rounded bg-[var(--canvas)] px-1.5 py-0.5 text-[11px] font-semibold">
                  {log.method}
                </code>
                <code className="text-[11px] break-all text-[var(--ink-muted)]">{log.endpoint}</code>
                <span className="ml-auto text-[11px] whitespace-nowrap text-[var(--ink-muted)]">
                  HTTP {log.statusCode ?? '-'} · {log.durationMs}ms · {formatDateTime(log.createdAt)}
                </span>
              </div>

              {!log.success && (
                <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-relaxed break-all text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
                  <p className="font-semibold">{log.errorCode}</p>
                  {log.responseSummary && <p className="mt-1 font-mono">{log.responseSummary}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
