import { NextRequest } from 'next/server';
import { ok, withErrorHandling } from '@/shared/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { unpublishPost } from '@/server/services/postService';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/posts/:id/unpublish
 * LinkedIn 에 올라간 실제 게시물을 삭제하고, 우리 기록은 REMOVED 로 남깁니다.
 * (되돌릴 수 없는 작업 — UI 에서 확인 모달을 거칩니다)
 */
export const POST = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;

  const result = await unpublishPost(session.userId, id);
  return ok(result);
});
