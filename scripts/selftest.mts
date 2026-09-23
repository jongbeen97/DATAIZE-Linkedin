/**
 * 핵심 로직 자체 검증 스크립트
 *   실행: npm run test
 *
 * DB 와 외부 API 없이 순수 로직만 검증합니다.
 *   [1] 게시물 상태 전이 규칙  [2] 입력 검증 스키마  [3] 토큰 암호화
 *   [4] 일자별 집계 키(타임존)  [5] 연동 로그 설명(작업 x 오류 조합)
 */
import {
  canTransition,
  isEditable,
  isDeletable,
  isLiveOnLinkedIn,
  LINKEDIN_MAX_CONTENT_LENGTH,
} from '../src/entities/post';
import { toDateKey, recentDateKeys, fillDailySeries } from '../src/shared/lib/date';
import { createPostSchema } from '../src/features/posts/model/schema';
import { classifyLogAction, explainFailure } from '../src/features/logs/model/describeLog';

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

check('PUBLISHED 삭제 차단 (LinkedIn 에 글이 살아 있음)', !isDeletable('PUBLISHED'));
check('PUBLISHING 삭제 차단', !isDeletable('PUBLISHING'));
check('DRAFT 삭제 허용', isDeletable('DRAFT'));
check('SCHEDULED 삭제 허용', isDeletable('SCHEDULED'));
check('FAILED 삭제 허용', isDeletable('FAILED'));

// LinkedIn 에서 원본이 삭제된 경우에만 PUBLISHED 를 벗어날 수 있다
check('PUBLISHED -> REMOVED 허용 (LinkedIn 에서 삭제 감지)', canTransition('PUBLISHED', 'REMOVED'));
check('PUBLISHED -> DRAFT 는 여전히 차단', !canTransition('PUBLISHED', 'DRAFT'));
check('REMOVED 는 종착역 (되살릴 수 없음)', !canTransition('REMOVED', 'PUBLISHED'));
check('REMOVED 삭제 허용 (원본이 이미 없음)', isDeletable('REMOVED'));
check('REMOVED 수정 차단', !isEditable('REMOVED'));
check('PUBLISHED 만 LinkedIn 에 살아 있음', isLiveOnLinkedIn('PUBLISHED'));
check('REMOVED 는 LinkedIn 링크 없음', !isLiveOnLinkedIn('REMOVED'));

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

console.log('');
console.log('[4] 일자별 집계 키 (타임존)');
// 집계($dateToString timezone:'Asia/Seoul')와 차트 키가 같은 타임존이어야 합니다.
// toISOString() 을 쓰면 KST 00:00 = 전날 15:00 UTC 라서 하루씩 밀리고,
// 그 결과 '오늘' 데이터가 차트에서 통째로 사라집니다. (실제로 발생했던 버그)
const kstNoon = new Date('2026-09-22T03:00:00Z'); // = KST 09-22 12:00
check("KST 정오 -> '2026-09-22'", toDateKey(kstNoon) === '2026-09-22');
const kstEarly = new Date('2026-09-21T16:00:00Z'); // = KST 09-22 01:00
check("KST 새벽 1시 -> '2026-09-22'", toDateKey(kstEarly) === '2026-09-22');
check('같은 시각을 UTC 로 자르면 전날이 됨 (버그 재현)', kstEarly.toISOString().slice(0, 10) === '2026-09-21');

const keys = recentDateKeys(14);
check('최근 14일 키 개수', keys.length === 14);
check('마지막 키가 오늘(KST)', keys[13] === toDateKey(new Date()));
check('오래된 순 정렬', keys[0] < keys[13]);

const today = toDateKey(new Date());
const series = fillDailySeries([{ _id: today, count: 7 }], 14);
check('오늘 집계값이 시리즈에 반영됨', series[13].count === 7);
check('데이터 없는 날은 0 으로 채움', series[0].count === 0);
check('전체 합계 보존', series.reduce((a, b) => a + b.count, 0) === 7);

console.log('');
console.log('[5] 연동 로그 설명 (작업 x 오류 조합)');
check('POST /rest/posts -> 게시물 발행', classifyLogAction('POST', '/rest/posts') === 'publish');
check('DELETE /rest/posts/{urn} -> 삭제', classifyLogAction('DELETE', '/rest/posts/urn%3Ali%3Ashare%3A1') === 'unpublish');
check('쿼리스트링이 붙은 지표 조회 경로 판별',
  classifyLogAction('GET', '/rest/memberCreatorPostAnalytics?q=entity&entity=x') === 'analytics');

// 같은 403 이라도 어떤 작업이었느냐에 따라 급한 정도가 다르다
const denyMetrics = explainFailure({ method: 'GET', endpoint: '/rest/socialMetadata/urn', errorCode: 'LINKEDIN_PERMISSION_DENIED', statusCode: 403 });
const denyPublish = explainFailure({ method: 'POST', endpoint: '/rest/posts', errorCode: 'LINKEDIN_PERMISSION_DENIED', statusCode: 403 });
check('지표 조회 403 -> 게시에는 영향 없음 (info)', denyMetrics.severity === 'info');
check('게시 403 -> 조치 필요 (action)', denyPublish.severity === 'action');
check('두 403 의 설명이 서로 다름', denyMetrics.summary !== denyPublish.summary);

// 이미 지워진 글을 지우려던 404 는 실패처럼 보여도 문제가 아니다
check('삭제 404 -> 참고 (할 일 없음, info)',
  explainFailure({ method: 'DELETE', endpoint: '/rest/posts/urn', errorCode: 'LINKEDIN_NOT_FOUND', statusCode: 404 }).severity === 'info');
check('일시 장애 -> 잠시 후 재시도 (wait)',
  explainFailure({ method: 'POST', endpoint: '/rest/posts', errorCode: 'LINKEDIN_UNAVAILABLE', statusCode: 503 }).severity === 'wait');
check('LinkedIn 거절 사유(message)를 설명에 포함',
  explainFailure({ method: 'POST', endpoint: '/rest/posts', errorCode: 'LINKEDIN_BAD_REQUEST', statusCode: 422,
    responseSummary: '{"message":"Content is too long"}' }).cause.includes('Content is too long'));
check('모르는 오류 코드도 빈 설명 없이 처리',
  explainFailure({ method: 'GET', endpoint: '/x', errorCode: 'WHATEVER', statusCode: 418 }).fix.length > 0);

// "'반응 · 댓글 수 조회'이 거절" 처럼 따옴표로 끼운 이름 뒤 조사가 틀어지던 문제의 재발 방지
const allCombos = ['LINKEDIN_TOKEN_EXPIRED', 'LINKEDIN_PERMISSION_DENIED', 'LINKEDIN_NOT_FOUND',
  'LINKEDIN_RATE_LIMITED', 'LINKEDIN_UNAVAILABLE', 'LINKEDIN_BAD_REQUEST', 'OTHER']
  .flatMap((code) => [['POST', '/rest/posts'], ['DELETE', '/rest/posts/u'], ['GET', '/rest/socialMetadata/u']]
    .map(([method, endpoint]) => explainFailure({ method, endpoint, errorCode: code, statusCode: 400 })));
check('모든 설명에 따옴표 뒤 조사 결합이 없음',
  allCombos.every((e) => !/['’][이가을를은는]\s/.test(`${e.summary} ${e.cause} ${e.fix}`)));


console.log(`\n결과: ${pass} 통과 / ${fail} 실패\n`);
process.exit(fail > 0 ? 1 : 0);
