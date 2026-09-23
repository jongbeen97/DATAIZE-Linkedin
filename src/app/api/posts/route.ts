import { NextRequest } from 'next/server';
import { ok, fail, withErrorHandling } from '@/server/http/response';
import { requireSession } from '@/server/auth/session';
import { ensureIndexes } from '@/server/db/mongo';
import { countByStatus, listPosts } from '@/server/repositories/postRepository';
import { createPost } from '@/server/services/postService';
import { createPostSchema, listPostsQuerySchema } from '@/features/posts/model/schema';

export const dynamic = 'force-dynamic';

/** GET /api/posts — 목록 (검색/상태필터/기간/페이지네이션) */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await requireSession();
  await ensureIndexes();

  const raw = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = listPostsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return fail('VALIDATION_FAILED', '조회 조건이 올바르지 않습니다.', parsed.error.flatten());
  }

  const q = parsed.data;
  // 상단 수치 띠는 필터와 무관한 전체 기준입니다 — 목록을 좁혀도 전체 규모는 그대로 보여야 합니다
  const [result, statusCounts] = await Promise.all([
    listPosts({
      userId: session.userId,
      status: q.status,
      keyword: q.keyword || undefined,
      from: q.from ? new Date(`${q.from}T00:00:00+09:00`) : undefined,
      to: q.to ? new Date(`${q.to}T23:59:59+09:00`) : undefined,
      page: q.page,
      pageSize: q.pageSize,
    }),
    countByStatus(session.userId),
  ]);

  return ok({ ...result, statusCounts });
});

/** POST /api/posts — 생성 (초안 또는 예약) */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireSession();
  await ensureIndexes();

  const body = await req.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    // 어떤 필드가 왜 틀렸는지 프론트가 필드별로 표시할 수 있도록 flatten 해서 내려준다
    return fail('VALIDATION_FAILED', '입력값을 확인해 주세요.', parsed.error.flatten().fieldErrors);
  }

  const post = await createPost(session.userId, parsed.data);
  return ok(post, 201);
});
