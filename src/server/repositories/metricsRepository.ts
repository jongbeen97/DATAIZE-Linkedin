import { ObjectId } from 'mongodb';
import { collection, COLLECTIONS } from '@/server/db/mongo';
import type { PostMetricsSnapshot } from '@/entities/post';
import type { PostMetricsDoc } from './types';

export function toMetricsDomain(doc: PostMetricsDoc): PostMetricsSnapshot {
  return {
    postId: doc.postId.toHexString(),
    collectedAt: doc.collectedAt.toISOString(),
    source: doc.source,
    impressions: doc.impressions,
    membersReached: doc.membersReached,
    reactions: doc.reactions,
    comments: doc.comments,
    shares: doc.shares,
    clicks: doc.clicks,
  };
}

/**
 * 지표는 "덮어쓰기"가 아니라 "스냅샷 누적"으로 저장합니다.
 * 같은 게시물의 노출수가 시간에 따라 어떻게 늘었는지 추이를 볼 수 있어야 하고,
 * 나중에 수집 오류가 생겨도 과거 값을 잃지 않기 때문입니다.
 */
export async function saveMetricsSnapshot(
  snapshot: Omit<PostMetricsSnapshot, 'collectedAt'> & { collectedAt?: Date },
): Promise<void> {
  const col = await collection<PostMetricsDoc>(COLLECTIONS.postMetrics);
  await col.insertOne({
    postId: new ObjectId(snapshot.postId),
    collectedAt: snapshot.collectedAt ?? new Date(),
    source: snapshot.source,
    impressions: snapshot.impressions,
    membersReached: snapshot.membersReached,
    reactions: snapshot.reactions,
    comments: snapshot.comments,
    shares: snapshot.shares,
    clicks: snapshot.clicks,
  });
}

export async function findLatestMetrics(postId: string): Promise<PostMetricsSnapshot | null> {
  const col = await collection<PostMetricsDoc>(COLLECTIONS.postMetrics);
  const doc = await col.findOne({ postId: new ObjectId(postId) }, { sort: { collectedAt: -1 } });
  return doc ? toMetricsDomain(doc) : null;
}

/** 여러 게시물의 최신 스냅샷을 한 번에 (N+1 방지) */
export async function findLatestMetricsForPosts(
  postIds: string[],
): Promise<Map<string, PostMetricsSnapshot>> {
  if (postIds.length === 0) return new Map();
  const col = await collection<PostMetricsDoc>(COLLECTIONS.postMetrics);

  const rows = await col
    .aggregate<PostMetricsDoc>([
      { $match: { postId: { $in: postIds.map((id) => new ObjectId(id)) } } },
      { $sort: { collectedAt: -1 } },
      { $group: { _id: '$postId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ])
    .toArray();

  return new Map(rows.map((r) => [r.postId.toHexString(), toMetricsDomain(r)]));
}

/** 마지막 수집 시각 — 화면의 "마지막 수집: N분 전" 표시용 */
export async function findLastCollectedAt(postIds: string[]): Promise<string | null> {
  if (postIds.length === 0) return null;
  const col = await collection<PostMetricsDoc>(COLLECTIONS.postMetrics);
  const doc = await col.findOne(
    { postId: { $in: postIds.map((id) => new ObjectId(id)) } },
    { sort: { collectedAt: -1 } },
  );
  return doc ? doc.collectedAt.toISOString() : null;
}

/* ------------------------------------------------------------------ *
 * 누적된 스냅샷 활용
 *
 * 스냅샷을 쌓아두기만 하고 최신 1건만 읽으면 시계열로 설계한 의미가 없습니다.
 * 아래 두 함수가 "쌓아둔 이력"을 실제로 사용하는 지점입니다.
 * ------------------------------------------------------------------ */

/** 게시물 하나의 수집 이력 (오래된 순) — 상세 화면의 추이 스파크라인용 */
export async function findMetricsHistory(
  postId: string,
  limit = 30,
): Promise<PostMetricsSnapshot[]> {
  const col = await collection<PostMetricsDoc>(COLLECTIONS.postMetrics);
  const docs = await col
    .find({ postId: new ObjectId(postId) })
    .sort({ collectedAt: -1 })
    .limit(limit)
    .toArray();
  // 조회는 최신순(인덱스 활용), 반환은 오래된 순(차트가 읽는 순서)
  return docs.reverse().map(toMetricsDomain);
}
