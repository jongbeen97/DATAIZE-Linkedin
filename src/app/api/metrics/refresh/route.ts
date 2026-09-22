import { ok, withErrorHandling } from '@/server/http/response';
import { requireSession } from '@/server/auth/session';
import { refreshAllMetrics } from '@/server/services/postService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/metrics/refresh
 *
 * 화면을 열 때마다 LinkedIn 을 호출하면 하루 150회 한도를 금방 소진합니다.
 * 그래서 조회는 항상 우리 DB 를 읽고, 수집은 이 엔드포인트를 통해
 * (운영자의 명시적 요청 또는 스케줄러로) 별도로 수행합니다.
 */
export const POST = withErrorHandling(async () => {
  const session = await requireSession();
  const result = await refreshAllMetrics(session.userId);
  return ok(result);
});
