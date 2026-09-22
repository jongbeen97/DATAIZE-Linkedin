import { ok, withErrorHandling } from '@/shared/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { ensureIndexes } from '@/server/db/mongo';
import { buildDashboardSummary } from '@/server/services/analyticsService';

export const dynamic = 'force-dynamic';

/** GET /api/analytics/summary — 대시보드 한 화면에 필요한 전체 데이터 */
export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  await ensureIndexes();
  const summary = await buildDashboardSummary(session.userId);
  return ok(summary);
});
