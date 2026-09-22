import { ok, withErrorHandling } from '@/shared/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { listApiCallLogs } from '@/server/repositories/apiLogRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/logs — LinkedIn 연동 호출 로그
 *
 * 운영 담당자가 "왜 게시가 실패했는지"를 개발자에게 묻지 않고
 * 직접 확인할 수 있도록 만든 화면용 API 입니다.
 */
export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  const logs = await listApiCallLogs(session.userId, 100);
  return ok(logs);
});
