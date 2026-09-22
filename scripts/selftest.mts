/**
 * 핵심 로직 자체 검증 스크립트
 *   실행: npm run test
 *
 * DB 와 외부 API 없이 순수 로직만 검증합니다.
 *   [1] 게시물 상태 전이 규칙  [2] 입력 검증 스키마  [3] 토큰 암호화
 */
import { canTransition, isEditable, LINKEDIN_MAX_CONTENT_LENGTH } from '../src/entities/post';
import { createPostSchema } from '../src/features/posts/model/schema';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log('\n[1] 상태 전이 규칙');
check('DRAFT → PUBLISHING 허용', canTransition('DRAFT', 'PUBLISHING'));
check('FAILED → PUBLISHING 허용 (재시도)', canTransition('FAILED', 'PUBLISHING'));
check('PUBLISHED → DRAFT 차단', !canTransition('PUBLISHED', 'DRAFT'));
check('PUBLISHED → PUBLISHING 차단 (중복 발행 방지)', !canTransition('PUBLISHED', 'PUBLISHING'));
check('PUBLISHING 중 수정 차단', !isEditable('PUBLISHING'));
check('PUBLISHED 수정 차단', !isEditable('PUBLISHED'));
check('FAILED 수정 허용', isEditable('FAILED'));

console.log('\n[2] 입력 검증 스키마');
const okCase = createPostSchema.safeParse({ title: '테스트', content: '본문', visibility: 'PUBLIC', status: 'DRAFT', scheduledAt: null });
check('정상 입력 통과', okCase.success);

const tooLong = createPostSchema.safeParse({ title: 'a', content: 'x'.repeat(LINKEDIN_MAX_CONTENT_LENGTH + 1), visibility: 'PUBLIC', status: 'DRAFT', scheduledAt: null });
check('3,000자 초과 거부', !tooLong.success);

const emptyTitle = createPostSchema.safeParse({ title: '   ', content: '본문', visibility: 'PUBLIC', status: 'DRAFT', scheduledAt: null });
check('빈 제목 거부', !emptyTitle.success);

const schedWithoutTime = createPostSchema.safeParse({ title: 'a', content: 'b', visibility: 'PUBLIC', status: 'SCHEDULED', scheduledAt: null });
check('예약 상태인데 예약 시각 없으면 거부', !schedWithoutTime.success);

const pastSchedule = createPostSchema.safeParse({ title: 'a', content: 'b', visibility: 'PUBLIC', status: 'SCHEDULED', scheduledAt: new Date(Date.now() - 86400000).toISOString() });
check('과거 예약 시각 거부', !pastSchedule.success);

const future = createPostSchema.safeParse({ title: 'a', content: 'b', visibility: 'PUBLIC', status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 86400000).toISOString() });
check('미래 예약 시각 통과', future.success);

console.log('\n[3] 토큰 암호화 (AES-256-GCM)');
process.env.APP_BASE_URL = 'http://localhost:3000';
process.env.MONGODB_URI = 'mongodb://x';
process.env.LINKEDIN_CLIENT_ID = 'x';
process.env.LINKEDIN_CLIENT_SECRET = 'x';
process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3000/cb';
process.env.LINKEDIN_API_VERSION = '202609';
process.env.SESSION_SECRET = '0'.repeat(64);
process.env.TOKEN_ENCRYPTION_KEY = '1'.repeat(64);

const { encryptSecret, decryptSecret } = await import('../src/server/crypto');
const secret = 'AQV_linkedin_access_token_example_12345';
const enc = encryptSecret(secret);
check('암호문에 원문이 남지 않음', !enc.includes(secret));
check('복호화하면 원문이 그대로 복원됨', decryptSecret(enc) === secret);
check('같은 값도 매번 다른 암호문 (IV 무작위)', encryptSecret(secret) !== enc);
let tampered = false;
try { decryptSecret(enc.replace(/.$/, enc.endsWith('a') ? 'b' : 'a')); } catch { tampered = true; }
check('변조 탐지 (GCM auth tag)', tampered);

console.log(`\n결과: ${pass} 통과 / ${fail} 실패\n`);
process.exit(fail > 0 ? 1 : 0);
