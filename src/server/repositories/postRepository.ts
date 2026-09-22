import { ObjectId, Filter } from 'mongodb';
import { collection, COLLECTIONS } from '@/server/db/mongo';
import { REPORT_TIMEZONE, sinceDaysAgo, fillDailySeries } from '@/shared/lib/date';
import type { Post, PostStatus, PostVisibility, PostWithMetrics } from '@/entities/post';
import type { PostDoc, PostMetricsDoc } from './types';
import { toMetricsDomain } from './metricsRepository';

function toDomain(doc: PostDoc): Post {
  return {
    id: doc._id!.toHexString(),
    userId: doc.userId.toHexString(),
    title: doc.title,
    content: doc.content,
    visibility: doc.visibility,
    status: doc.status,
    scheduledAt: doc.scheduledAt?.toISOString() ?? null,
    idempotencyKey: doc.idempotencyKey,
    linkedinUrn: doc.linkedinUrn,
    linkedinUrl: doc.linkedinUrl,
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    failReason: doc.failReason,
    failCode: doc.failCode,
    publishAttempts: doc.publishAttempts,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export interface ListPostsParams {
  userId: string;
  status?: PostStatus;
  keyword?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface ListPostsResult {
  items: PostWithMetrics[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 목록 조회.
 *
 * 지표를 게시물마다 따로 조회하면 N+1 이 발생하므로,
 * $lookup 으로 한 번의 쿼리에 최신 지표 스냅샷 1건씩을 붙여옵니다.
 */
export async function listPosts(params: ListPostsParams): Promise<ListPostsResult> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);

  const filter: Filter<PostDoc> = { userId: new ObjectId(params.userId) };
  if (params.status) filter.status = params.status;
  if (params.keyword) {
    // 정규식 특수문자를 이스케이프해 사용자 입력이 쿼리를 깨뜨리지 않게 한다
    const safe = params.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { content: { $regex: safe, $options: 'i' } },
    ];
  }
  if (params.from || params.to) {
    filter.createdAt = {
      ...(params.from ? { $gte: params.from } : {}),
      ...(params.to ? { $lte: params.to } : {}),
    };
  }

  const skip = (params.page - 1) * params.pageSize;

  const [rows, total] = await Promise.all([
    col
      .aggregate<PostDoc & { recentMetrics: PostMetricsDoc[] }>([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: params.pageSize },
        {
          $lookup: {
            from: COLLECTIONS.postMetrics,
            let: { pid: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$postId', '$$pid'] } } },
              { $sort: { collectedAt: -1 } },
              // 최신 1건이 아니라 2건 — 두 번째가 있어야 증감을 계산할 수 있습니다.
              // 게시물마다 따로 조회하면 N+1 이므로 이 $lookup 안에서 함께 가져옵니다.
              { $limit: 2 },
            ],
            as: 'recentMetrics',
          },
        },
      ])
      .toArray(),
    col.countDocuments(filter),
  ]);

  return {
    items: rows.map((row) => {
      const [latest, previous] = row.recentMetrics;
      return {
        ...toDomain(row),
        metrics: latest ? toMetricsDomain(latest) : null,
        impressionsDelta:
          latest && previous ? latest.impressions - previous.impressions : null,
      };
    }),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function findPostById(userId: string, postId: string): Promise<Post | null> {
  if (!ObjectId.isValid(postId)) return null;
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  const doc = await col.findOne({ _id: new ObjectId(postId), userId: new ObjectId(userId) });
  return doc ? toDomain(doc) : null;
}

export async function createPost(input: {
  userId: string;
  title: string;
  content: string;
  visibility: PostVisibility;
  status: Extract<PostStatus, 'DRAFT' | 'SCHEDULED'>;
  scheduledAt: Date | null;
}): Promise<Post> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  const now = new Date();

  const doc: PostDoc = {
    userId: new ObjectId(input.userId),
    title: input.title,
    content: input.content,
    visibility: input.visibility,
    status: input.status,
    scheduledAt: input.scheduledAt,
    idempotencyKey: null,
    linkedinUrn: null,
    linkedinUrl: null,
    publishedAt: null,
    failReason: null,
    failCode: null,
    publishAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  const res = await col.insertOne(doc);
  return toDomain({ ...doc, _id: res.insertedId });
}

export async function updatePostContent(
  userId: string,
  postId: string,
  patch: Partial<Pick<PostDoc, 'title' | 'content' | 'visibility' | 'scheduledAt' | 'status'>>,
): Promise<Post | null> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(postId), userId: new ObjectId(userId) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return doc ? toDomain(doc) : null;
}

export async function deletePost(userId: string, postId: string): Promise<boolean> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  const res = await col.deleteOne({ _id: new ObjectId(postId), userId: new ObjectId(userId) });
  if (res.deletedCount !== 1) return false;

  // 게시물만 지우면 지표 문서가 고아로 남습니다. 어떤 화면에서도 보이지 않은 채
  // 계속 쌓이므로 게시물과 함께 정리합니다.
  const metrics = await collection<PostMetricsDoc>(COLLECTIONS.postMetrics);
  await metrics.deleteMany({ postId: new ObjectId(postId) });
  return true;
}

/* ------------------------------------------------------------------ *
 * 발행 관련 — 동시성/멱등성 처리
 * ------------------------------------------------------------------ */

/**
 * 발행 시작 잠금(lock).
 *
 * "status 가 아직 PUBLISHING 이 아닐 때만" PUBLISHING 으로 바꾸는 원자적 연산입니다.
 * 사용자가 [게시] 버튼을 빠르게 두 번 눌러 요청이 동시에 들어와도
 * 조건을 통과하는 요청은 하나뿐이므로 LinkedIn 에 두 번 올라가지 않습니다.
 *
 * 반환값이 null 이면 "이미 다른 요청이 발행 중" 이라는 뜻입니다.
 */
export async function acquirePublishLock(
  userId: string,
  postId: string,
  idempotencyKey: string,
): Promise<Post | null> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  const doc = await col.findOneAndUpdate(
    {
      _id: new ObjectId(postId),
      userId: new ObjectId(userId),
      status: { $in: ['DRAFT', 'SCHEDULED', 'FAILED'] },
    },
    {
      $set: {
        status: 'PUBLISHING',
        idempotencyKey,
        failReason: null,
        failCode: null,
        updatedAt: new Date(),
      },
      $inc: { publishAttempts: 1 },
    },
    { returnDocument: 'after' },
  );
  return doc ? toDomain(doc) : null;
}

export async function markPublished(
  postId: string,
  linkedinUrn: string,
  linkedinUrl: string,
): Promise<void> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  await col.updateOne(
    { _id: new ObjectId(postId) },
    {
      $set: {
        status: 'PUBLISHED',
        linkedinUrn,
        linkedinUrl,
        publishedAt: new Date(),
        failReason: null,
        failCode: null,
        updatedAt: new Date(),
      },
    },
  );
}

/**
 * LinkedIn 에서 원본이 삭제된 것을 확인했을 때 상태만 정정합니다.
 * 성과 지표 / 호출 로그 / 리드 유입 기록은 그대로 보존합니다.
 * (이미 REMOVED 면 아무 일도 하지 않습니다 — 멱등)
 */
export async function markRemoved(postId: string): Promise<boolean> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  const res = await col.updateOne(
    { _id: new ObjectId(postId), status: 'PUBLISHED' },
    { $set: { status: 'REMOVED', updatedAt: new Date() } },
  );
  return res.modifiedCount === 1;
}

export async function markFailed(postId: string, code: string, reason: string): Promise<void> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  await col.updateOne(
    { _id: new ObjectId(postId) },
    {
      $set: {
        status: 'FAILED',
        failCode: code,
        failReason: reason,
        idempotencyKey: null,
        updatedAt: new Date(),
      },
    },
  );
}

/* ------------------------------------------------------------------ *
 * 집계 — 애플리케이션이 아니라 DB 에서 계산한다
 * ------------------------------------------------------------------ */

export async function countByStatus(userId: string): Promise<Record<PostStatus, number>> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  const rows = await col
    .aggregate<{ _id: PostStatus; count: number }>([
      { $match: { userId: new ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  const base: Record<PostStatus, number> = {
    DRAFT: 0,
    SCHEDULED: 0,
    PUBLISHING: 0,
    PUBLISHED: 0,
    FAILED: 0,
    REMOVED: 0,
  };
  for (const row of rows) base[row._id] = row.count;
  return base;
}

/** 최근 N일 일자별 발행 건수 (대시보드 차트용) */
export async function dailyPublishedCounts(
  userId: string,
  days: number,
): Promise<Array<{ date: string; count: number }>> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);

  const rows = await col
    .aggregate<{ _id: string; count: number }>([
      {
        $match: {
          userId: new ObjectId(userId),
          status: 'PUBLISHED',
          publishedAt: { $gte: sinceDaysAgo(days) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$publishedAt', timezone: REPORT_TIMEZONE },
          },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  // 집계와 동일한 타임존 기준 키로 채웁니다. 데이터가 없는 날도 0 으로 채워야 차트가 끊기지 않습니다.
  return fillDailySeries(rows, days);
}

/**
 * 성과 집계 대상 게시물 ID.
 *
 * PUBLISHED 뿐 아니라 REMOVED 도 포함합니다.
 * LinkedIn 에서 내려간 글이라도 그동안 만들어 낸 노출·리드는 유효한 기록이라,
 * 집계에서 빼면 글을 내리는 순간 누적 성과가 갑자기 줄어듭니다.
 *
 * ⚠️ 지표 '수집' 대상과는 다릅니다.
 *    수집은 실제로 조회 가능한 PUBLISHED 만 대상으로 합니다 (refreshAllMetrics).
 */
export async function findPostIdsForAnalytics(userId: string, limit = 50): Promise<string[]> {
  const col = await collection<PostDoc>(COLLECTIONS.posts);
  const docs = await col
    .find({ userId: new ObjectId(userId), status: { $in: ['PUBLISHED', 'REMOVED'] } })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .project<{ _id: ObjectId }>({ _id: 1 })
    .toArray();
  return docs.map((d) => d._id.toHexString());
}
