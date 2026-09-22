import { NextRequest } from 'next/server';
import { ok, fail, withErrorHandling, AppError } from '@/shared/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { findPostById } from '@/server/repositories/postRepository';
import { findLatestMetrics } from '@/server/repositories/metricsRepository';
import { updatePost, removePost } from '@/server/services/postService';
import { updatePostSchema } from '@/features/posts/model/schema';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/posts/:id — 단건 조회 (최신 지표 포함) */
export const GET = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;

  const post = await findPostById(session.userId, id);
  if (!post) throw new AppError('NOT_FOUND', '게시물을 찾을 수 없습니다.');

  const metrics = await findLatestMetrics(id);
  return ok({ ...post, metrics });
});

/** PATCH /api/posts/:id — 수정 */
export const PATCH = withErrorHandling(async (req: NextRequest, ctx: Ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return fail('VALIDATION_FAILED', '입력값을 확인해 주세요.', parsed.error.flatten().fieldErrors);
  }

  const post = await updatePost(session.userId, id, parsed.data);
  return ok(post);
});

/** DELETE /api/posts/:id — 삭제 */
export const DELETE = withErrorHandling(async (_req: NextRequest, ctx: Ctx) => {
  const session = await requireSession();
  const { id } = await ctx.params;
  await removePost(session.userId, id);
  return ok({ id });
});
