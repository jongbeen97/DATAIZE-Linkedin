/**
 * 예시 데이터 생성 스크립트
 *   실행: npm run seed
 *
 * 리드/유입 데이터는 실제 랜딩 페이지가 있어야 쌓이는 값이라,
 * 화면과 집계 로직을 검증할 수 있도록 최근 14일치 예시 데이터를 넣어줍니다.
 * 게시물과 LinkedIn 연동 데이터는 실제 동작으로 쌓이므로 건드리지 않습니다.
 */
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

// Next.js 와 동일하게 .env.local 을 우선 읽습니다 (없으면 .env 로 폴백)
config({ path: '.env.local' });
config();

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

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? 'dataize_admin';

  if (!uri) {
    console.error('❌ MONGODB_URI 가 설정되어 있지 않습니다. 프로젝트 루트의 .env.local 을 확인해 주세요.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const existing = await db.collection('leads').countDocuments();
  if (existing > 0) {
    console.log(`ℹ️  leads 컬렉션에 이미 ${existing}건이 있습니다. 기존 데이터를 지우고 다시 넣습니다.`);
    await db.collection('leads').deleteMany({});
  }

  const docs = Array.from({ length: 42 }, (_, i) => {
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.6) * 14); // 최근일수록 많게
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0, 0);

    const name = NAMES[i % NAMES.length];
    return {
      name,
      email: `lead${String(i + 1).padStart(2, '0')}@example.com`,
      company: COMPANIES[i % COMPANIES.length],
      source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
      referrerPostId: null,
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      createdAt,
    };
  });

  const res = await db.collection('leads').insertMany(docs);
  console.log(`✅ 예시 리드 ${res.insertedCount}건을 생성했습니다.`);
  console.log('   브라우저에서 /leads 와 /dashboard 를 새로고침해 확인하세요.');

  await client.close();
}

main().catch((e) => {
  console.error('❌ seed 실행 실패:', e);
  process.exit(1);
});
