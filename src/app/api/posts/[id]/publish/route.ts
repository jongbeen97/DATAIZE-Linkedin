import { NextRequest } from 'next/server';
import { ok, withErrorHandling } from '@/server/http/response';
import { requireSession } from '@/server/auth/session';
import { publishPost } from '@/server/services/postService';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/posts/:id/publish
 * 실제 LinkedIn 에 게시합니다. (되돌릴 수 없는 작업)
 *
 * 중복 게시 방지는 서비스 계층에서 처리합니다.
 *  - 이미 PUBLISHED  → ALREADY_PUBLISHED (LinkedIn 재호출 없음)
 *  - 동시 요청       → findOneAndUpdate 원자적 잠금으로 하나만 통과
 */
export const POST = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;

  const post = await publishPost(session.userId, id);
  return ok(post);
});
