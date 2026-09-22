import { randomUUID } from 'node:crypto';
import { AppError } from '@/shared/lib/api-response';
import { canTransition, isEditable, type Post } from '@/entities/post';
import * as postRepo from '@/server/repositories/postRepository';
import { findUserById } from '@/server/repositories/userRepository';
import { publishMemberPost } from '@/server/linkedin/posts';
import { getMetricsProvider } from '@/server/linkedin/metrics';
import { saveMetricsSnapshot } from '@/server/repositories/metricsRepository';
import type { CreatePostInput, UpdatePostInput } from '@/features/posts/model/schema';

/**
 * 게시물 비즈니스 로직 (Spring 의 @Service 계층에 해당).
 *
 * Route Handler 는 "요청을 받고 검증해서 이 함수를 부르는 일"만 하고,
 * 상태 전이 규칙 / 외부 API 호출 순서 / 실패 처리는 전부 여기 모여 있습니다.
 */

export async function createPost(userId: string, input: CreatePostInput): Promise<Post> {
  return postRepo.createPost({
    userId,
    title: input.title,
    content: input.content,
    visibility: input.visibility,
    status: input.status,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
  });
}

export async function updatePost(
  userId: string,
  postId: string,
  input: UpdatePostInput,
): Promise<Post> {
  const current = await postRepo.findPostById(userId, postId);
  if (!current) throw new AppError('NOT_FOUND', '게시물을 찾을 수 없습니다.');

  if (!isEditable(current.status)) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `'${current.status}' 상태의 게시물은 수정할 수 없습니다. 이미 LinkedIn 에 발행된 글은 관리자 페이지에서 되돌릴 수 없습니다.`,
    );
  }

  const updated = await postRepo.updatePostContent(userId, postId, {
    title: input.title,
    content: input.content,
    visibility: input.visibility,
    status: input.status,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
  });
  if (!updated) throw new AppError('NOT_FOUND', '게시물을 찾을 수 없습니다.');
  return updated;
}

export async function removePost(userId: string, postId: string): Promise<void> {
  const current = await postRepo.findPostById(userId, postId);
  if (!current) throw new AppError('NOT_FOUND', '게시물을 찾을 수 없습니다.');
  if (current.status === 'PUBLISHING') {
    throw new AppError('INVALID_STATUS_TRANSITION', '발행 중인 게시물은 삭제할 수 없습니다.');
  }
  await postRepo.deletePost(userId, postId);
}

/* ------------------------------------------------------------------ *
 * 발행 — 이 함수가 이 프로젝트에서 가장 중요한 로직입니다
 * ------------------------------------------------------------------ */

/**
 * 발행 절차
 *   ① 게시물/사용자 존재 확인
 *   ② 이미 발행된 글이면 즉시 중단 (중복 게시 방지 1차)
 *   ③ 상태 전이 규칙 검사
 *   ④ 원자적 잠금: status 를 PUBLISHING 으로 선점 (중복 게시 방지 2차 — 동시 요청 차단)
 *   ⑤ LinkedIn API 호출
 *   ⑥ 성공 → PUBLISHED + URN 저장 / 실패 → FAILED + 사유 저장
 *   ⑦ 첫 지표 스냅샷 수집 (실패해도 발행 자체는 성공으로 처리)
 */
export async function publishPost(userId: string, postId: string): Promise<Post> {
  const post = await postRepo.findPostById(userId, postId);
  if (!post) throw new AppError('NOT_FOUND', '게시물을 찾을 수 없습니다.');

  // ② 이미 발행됨 — 다시 호출해도 LinkedIn 에 두 번 올라가지 않는다 (멱등)
  if (post.status === 'PUBLISHED') {
    throw new AppError(
      'ALREADY_PUBLISHED',
      '이미 LinkedIn 에 발행된 게시물입니다.',
      { linkedinUrl: post.linkedinUrl },
    );
  }
  if (post.status === 'PUBLISHING') {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      '현재 발행이 진행 중입니다. 잠시 후 다시 확인해 주세요.',
    );
  }

  // ③ 상태 전이 규칙
  if (!canTransition(post.status, 'PUBLISHING')) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `'${post.status}' 상태에서는 발행할 수 없습니다.`,
    );
  }

  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED', '사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');

  // ④ 원자적 잠금 — 동시에 두 번 눌러도 통과하는 요청은 하나뿐
  const idempotencyKey = randomUUID();
  const locked = await postRepo.acquirePublishLock(userId, postId, idempotencyKey);
  if (!locked) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      '다른 요청이 이미 발행을 처리하고 있습니다. 잠시 후 목록을 새로고침해 주세요.',
    );
  }

  try {
    // ⑤ 실제 LinkedIn 게시
    const result = await publishMemberPost({
      userId,
      personUrn: user.personUrn,
      content: locked.content,
      visibility: locked.visibility,
    });

    // ⑥ 성공 기록
    await postRepo.markPublished(postId, result.urn, result.url);

    // ⑦ 첫 지표 스냅샷 — 실패해도 발행은 성공이다
    try {
      await collectMetricsFor(userId, postId, result.urn, new Date().toISOString());
    } catch (e) {
      console.warn('[publish] 최초 지표 수집 실패 (발행 자체는 성공)', e);
    }

    const published = await postRepo.findPostById(userId, postId);
    return published!;
  } catch (e) {
    // ⑥ 실패 기록 — 사유를 남겨야 운영자가 화면에서 원인을 볼 수 있다
    const code = e instanceof AppError ? e.code : 'INTERNAL_ERROR';
    const reason = e instanceof Error ? e.message : '알 수 없는 오류';
    await postRepo.markFailed(postId, code, reason);
    throw e;
  }
}

/* ------------------------------------------------------------------ *
 * 지표 수집
 * ------------------------------------------------------------------ */

export async function collectMetricsFor(
  userId: string,
  postId: string,
  postUrn: string,
  publishedAt: string | null,
): Promise<void> {
  const provider = getMetricsProvider();
  const raw = await provider.fetchPostMetrics({ userId, postId, postUrn, publishedAt });
  await saveMetricsSnapshot({ postId, ...raw });
}

/** 발행된 모든 게시물의 지표를 한 번에 갱신 (화면의 [지금 새로고침] 버튼) */
export async function refreshAllMetrics(
  userId: string,
): Promise<{ updated: number; failed: number }> {
  const result = await postRepo.listPosts({
    userId,
    status: 'PUBLISHED',
    page: 1,
    pageSize: 50,
  });

  let updated = 0;
  let failed = 0;

  for (const post of result.items) {
    if (!post.linkedinUrn) continue;
    try {
      await collectMetricsFor(userId, post.id, post.linkedinUrn, post.publishedAt);
      updated++;
    } catch {
      failed++;
    }
  }
  return { updated, failed };
}
