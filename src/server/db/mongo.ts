import { MongoClient, Db, Collection, Document } from 'mongodb';
import { env } from '@/shared/config/env';

/**
 * Next.js 개발 모드는 파일이 바뀔 때마다 모듈을 새로 평가합니다.
 * 그때마다 새 커넥션을 만들면 Atlas 연결 수가 금방 고갈되므로
 * globalThis 에 커넥션을 캐싱합니다. (Spring 의 DataSource 싱글톤과 같은 역할)
 */
declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  if (!global.__mongoClientPromise) {
    const client = new MongoClient(env().MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
    global.__mongoClientPromise = client.connect();
  }
  return global.__mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(env().MONGODB_DB);
}

export async function collection<T extends Document>(name: CollectionName): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

/** 컬렉션 이름을 상수로 고정해 오타로 인한 '빈 컬렉션' 사고를 막는다 */
export const COLLECTIONS = {
  users: 'users',
  oauthTokens: 'oauthTokens',
  posts: 'posts',
  postMetrics: 'postMetrics',
  leads: 'leads',
  apiCallLogs: 'apiCallLogs',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/* ------------------------------------------------------------------ *
 * 인덱스 설계
 *
 * 인덱스는 "어떤 쿼리를 자주 쓸 것인가"의 선언입니다.
 * 아래 인덱스는 각각 다음 화면을 위한 것입니다.
 *   posts       : 목록 화면(사용자+상태 필터 + 최신순 정렬), 대시보드 상태별 집계
 *   postMetrics : 게시물별 최신 스냅샷 조회
 *   leads       : 리드 목록(최신순), 게시물별 유입 리드 조회
 *   apiCallLogs : 연동 로그 화면(최신순), 30일 후 자동 삭제(TTL)
 * ------------------------------------------------------------------ */
let indexesEnsured = false;

export async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();

  await Promise.all([
    db.collection(COLLECTIONS.users).createIndex({ linkedinSub: 1 }, { unique: true }),
    db.collection(COLLECTIONS.oauthTokens).createIndex({ userId: 1 }, { unique: true }),

    db.collection(COLLECTIONS.posts).createIndex({ userId: 1, status: 1, createdAt: -1 }),
    db.collection(COLLECTIONS.posts).createIndex({ userId: 1, createdAt: -1 }),
    // 멱등성 키는 값이 있을 때만 유일해야 하므로 partial unique index 사용
    db.collection(COLLECTIONS.posts).createIndex(
      { idempotencyKey: 1 },
      { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
    ),

    db.collection(COLLECTIONS.postMetrics).createIndex({ postId: 1, collectedAt: -1 }),
    db.collection(COLLECTIONS.leads).createIndex({ createdAt: -1 }),
    db.collection(COLLECTIONS.leads).createIndex({ referrerPostId: 1 }),

    db.collection(COLLECTIONS.apiCallLogs).createIndex({ createdAt: -1 }),
    // TTL: 로그는 30일 후 자동 삭제 (운영 시 스토리지 무한 증가 방지)
    db.collection(COLLECTIONS.apiCallLogs).createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 60 * 60 * 24 * 30 },
    ),
  ]);

  indexesEnsured = true;
}
