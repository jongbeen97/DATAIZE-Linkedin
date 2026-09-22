/**
 * 예시 데이터 생성 / 삭제 스크립트
 *   생성: npm run seed
 *   삭제: npm run seed:clean
 *
 * 리드·유입 데이터는 실제 랜딩 페이지가 있어야 쌓이는 값이라,
 * 화면과 집계 로직을 검증할 수 있도록 최근 14일치 예시 데이터를 넣어줍니다.
 *
 * ⚠️ 이 스크립트가 만든 문서에는 모두 `_seed: true` 표식이 붙습니다.
 *    실제 운영 데이터(직접 작성/발행한 게시물)는 이 표식이 없으므로
 *    npm run seed:clean 을 실행해도 절대 삭제되지 않습니다.
 */
import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

// Next.js 와 동일하게 .env.local 을 우선 읽습니다 (없으면 .env 로 폴백)
config({ path: '.env.local' });
config();

const SEED_FLAG = { _seed: true };
const SEEDED_COLLECTIONS = ['leads', 'posts', 'postMetrics'] as const;

const NAMES = [
  '김서연', '이도윤', '박지우', '최하준', '정예린', '강민재', '조유진', '윤시우',
  '장서준', '임하은', '한지호', '오수아', '신건우', '권다인', '황준서', '안소율',
];
const COMPANIES = [
  '퍼플랩스', '노바테크', '그린필드', '아틀라스소프트', '씨드컴퍼니', '리버사이드',
  null, '메이플웍스', '오션브릿지', null,
];
const SOURCES = ['linkedin', 'linkedin', 'linkedin', 'organic', 'referral', 'direct'] as const;
const STATUSES = ['NEW', 'NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;

/** 발행 실패는 실제로 일어날 수 있는 사유만 사용합니다 (errors.ts 의 코드와 동일) */
const FAIL_CASES = [
  { code: 'LINKEDIN_TOKEN_EXPIRED', reason: 'LinkedIn 액세스 토큰이 만료되었습니다. 다시 로그인해 주세요.' },
  { code: 'LINKEDIN_RATE_LIMITED', reason: 'LinkedIn 일일 호출 한도(멤버당 150회)를 초과했습니다.' },
];

const DRAFT_POSTS = [
  { title: '9월 프로덕트 업데이트 초안', content: '이번 달 개선 사항을 정리했습니다. 발행 전 마케팅팀 검토 필요.' },
  { title: '채용 공고 - 프론트엔드 엔지니어', content: '함께 성장할 프론트엔드 엔지니어를 찾습니다. JD 링크 추가 예정.' },
  { title: '고객 인터뷰 후기', content: '도입 3개월 차 고객사 인터뷰에서 나온 이야기를 공유합니다.' },
];
const SCHEDULED_POSTS = [
  { title: '웨비나 사전 안내', content: '다음 주 수요일 웨비나를 엽니다. 신청 링크는 댓글에 남겨두겠습니다.' },
  { title: '데이터 기반 마케팅 체크리스트', content: '실무에서 바로 쓰는 체크리스트 7가지를 정리했습니다.' },
];
const FAILED_POSTS = [
  { title: '신규 기능 출시 안내', content: '대시보드 개편 소식을 전합니다.' },
  { title: '팀 문화 소개', content: '저희가 일하는 방식을 소개합니다.' },
];

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

async function clean(db: import('mongodb').Db): Promise<void> {
  let total = 0;
  for (const col of SEEDED_COLLECTIONS) {
    const { deletedCount } = await db.collection(col).deleteMany(SEED_FLAG);
    if (deletedCount) console.log(`   ${col.padEnd(12)} ${deletedCount}건 삭제`);
    total += deletedCount;
  }
  console.log(total > 0 ? `✅ 예시 데이터 ${total}건을 삭제했습니다.` : 'ℹ️  삭제할 예시 데이터가 없습니다.');
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? 'dataize_admin';
  const isClean = process.argv.includes('--clean');

  if (!uri) {
    console.error('❌ MONGODB_URI 가 설정되어 있지 않습니다. 프로젝트 루트의 .env.local 을 확인해 주세요.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`📦 DB: ${dbName}\n`);

  if (isClean) {
    await clean(db);
    await client.close();
    return;
  }

  // 같은 스크립트를 여러 번 돌려도 예시 데이터가 중복되지 않도록 먼저 정리합니다.
  await clean(db);
  console.log();

  const user = await db.collection('users').findOne({});
  if (!user) {
    console.error('❌ users 컬렉션이 비어 있습니다. 먼저 LinkedIn 으로 로그인해 주세요.');
    console.error('   게시물은 로그인한 사용자에게 귀속되므로 계정 정보가 필요합니다.');
    await client.close();
    process.exit(1);
  }
  const userId = user._id;

  /* ---------------- 게시물 ---------------- */
  // PUBLISHED 는 만들지 않습니다. 실제로 LinkedIn 에 발행한 게시물만 PUBLISHED 여야
  // "실연동 증거"가 거짓이 되지 않기 때문입니다. (DRAFT/SCHEDULED/FAILED 는
  //  LinkedIn 에 닿은 적이 없는 로컬 상태이므로 예시로 만들어도 사실과 어긋나지 않습니다)
  const postDocs = [
    ...DRAFT_POSTS.map((p, i) => ({
      ...SEED_FLAG, userId, ...p,
      visibility: 'PUBLIC' as const, status: 'DRAFT' as const,
      scheduledAt: null, idempotencyKey: null,
      linkedinUrn: null, linkedinUrl: null, publishedAt: null,
      failReason: null, failCode: null, publishAttempts: 0,
      createdAt: daysAgo(i + 1), updatedAt: daysAgo(i + 1),
    })),
    ...SCHEDULED_POSTS.map((p, i) => {
      const at = new Date(); at.setDate(at.getDate() + i + 1); at.setHours(10, 0, 0, 0);
      return {
        ...SEED_FLAG, userId, ...p,
        visibility: 'PUBLIC' as const, status: 'SCHEDULED' as const,
        scheduledAt: at, idempotencyKey: null,
        linkedinUrn: null, linkedinUrl: null, publishedAt: null,
        failReason: null, failCode: null, publishAttempts: 0,
        createdAt: daysAgo(i + 1), updatedAt: daysAgo(i + 1),
      };
    }),
    ...FAILED_POSTS.map((p, i) => ({
      ...SEED_FLAG, userId, ...p,
      visibility: 'PUBLIC' as const, status: 'FAILED' as const,
      scheduledAt: null, idempotencyKey: null,
      linkedinUrn: null, linkedinUrl: null, publishedAt: null,
      failReason: FAIL_CASES[i].reason, failCode: FAIL_CASES[i].code,
      publishAttempts: i + 1,
      createdAt: daysAgo(i + 2), updatedAt: daysAgo(i + 2, 14),
    })),
  ];
  const postRes = await db.collection('posts').insertMany(postDocs);
  console.log(`✅ 예시 게시물 ${postRes.insertedCount}건 생성`);
  console.log(`   DRAFT ${DRAFT_POSTS.length} · SCHEDULED ${SCHEDULED_POSTS.length} · FAILED ${FAILED_POSTS.length}`);
  console.log('   (PUBLISHED 는 실제 발행분만 남겨두기 위해 생성하지 않습니다)');

  /* ---------------- 지표 수집 이력 ---------------- */
  // 실제 운영에서는 [지금 새로고침]을 누를 때마다 스냅샷이 한 건씩 쌓여 추이가 생깁니다.
  // 과제 시연 시점에는 발행 직후 1건뿐이라 추이 화면을 확인할 수 없으므로,
  // 이미 수집된 최신값을 기준으로 '발행 후 경과 시간'에 따른 과거 값을 역산해 채웁니다.
  //   value(h) = 최신값 × factor(h) / factor(경과시간)
  //   factor(h) = 0.3 + min(1, log10(h+1)/2)   ← sampleProvider 와 같은 성장 곡선
  const HISTORY_HOURS = [1, 3, 6, 12, 24, 48];
  const factor = (h: number) => 0.3 + Math.min(1, Math.log10(h + 1) / 2);

  let historyAdded = 0;
  for (const post of await db.collection('posts').find({ linkedinUrn: { $ne: null } }).toArray()) {
    const publishedAt = post.publishedAt as Date | null;
    if (!publishedAt) continue;

    const latest = await db
      .collection('postMetrics')
      .findOne({ postId: post._id }, { sort: { collectedAt: -1 } });
    if (!latest) continue;

    // 기존 스냅샷은 발행 직후에 수집된 값이므로 곡선의 출발점으로 봅니다.
    const elapsedH = Math.max(
      0,
      (latest.collectedAt.getTime() - publishedAt.getTime()) / 3_600_000,
    );
    const baseFactor = factor(elapsedH);
    const now = Date.now();

    for (const h of HISTORY_HOURS) {
      if (h <= elapsedH) continue;
      const at = new Date(publishedAt.getTime() + h * 3_600_000);
      if (at.getTime() > now) continue; // 미래 시점의 수집 기록은 만들지 않습니다
      const ratio = factor(h) / baseFactor;

      await db.collection('postMetrics').insertOne({
        ...SEED_FLAG,
        postId: post._id,
        collectedAt: at,
        source: 'sample',
        impressions: Math.round((latest.impressions as number) * ratio),
        membersReached: Math.round((latest.membersReached as number) * ratio),
        reactions: Math.round((latest.reactions as number) * ratio),
        comments: Math.round((latest.comments as number) * ratio),
        shares: Math.round((latest.shares as number) * ratio),
        clicks: Math.round((latest.clicks as number) * ratio),
      });
      historyAdded++;
    }
  }
  if (historyAdded > 0) {
    console.log(`
✅ 지표 수집 이력 ${historyAdded}건 생성 (추이 차트 확인용)`);
  }

  /* ---------------- 리드 ---------------- */
  // 실제로 발행된 게시물이 있으면 linkedin 유입 리드를 거기에 연결합니다.
  // → "어떤 게시물이 리드를 만들었는가"를 화면에서 확인할 수 있습니다.
  // 이미 내려간 글(REMOVED)도 과거에는 리드를 만들었을 수 있으므로,
  // 실제로 LinkedIn 에 올라간 적이 있는 글(URN 보유) 전체를 대상으로 합니다.
  const publishedIds = (
    await db
      .collection('posts')
      .find({ linkedinUrn: { $ne: null } }, { projection: { _id: 1 } })
      .toArray()
  ).map((d) => d._id as ObjectId);

  const leadDocs = Array.from({ length: 42 }, (_, i) => {
    const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
    return {
      ...SEED_FLAG,
      name: NAMES[i % NAMES.length],
      email: `lead${String(i + 1).padStart(2, '0')}@example.com`,
      company: COMPANIES[i % COMPANIES.length],
      source,
      referrerPostId:
        source === 'linkedin' && publishedIds.length > 0
          ? publishedIds[Math.floor(Math.random() * publishedIds.length)]
          : null,
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      // 최근일수록 많아지도록 분포를 기울입니다
      createdAt: daysAgo(Math.floor(Math.pow(Math.random(), 1.6) * 14), 9 + Math.floor(Math.random() * 11)),
    };
  });
  const leadRes = await db.collection('leads').insertMany(leadDocs);
  const linked = leadDocs.filter((l) => l.referrerPostId).length;
  console.log(`\n✅ 예시 리드 ${leadRes.insertedCount}건 생성`);
  console.log(`   그중 ${linked}건은 실제 발행 게시물에 유입 경로로 연결됨`);

  console.log('\n브라우저에서 /dashboard · /posts · /leads 를 새로고침해 확인하세요.');
  console.log('정리할 때는 npm run seed:clean 을 실행하세요.');
  await client.close();
}

main().catch((e) => {
  console.error('❌ seed 실행 실패:', e);
  process.exit(1);
});
