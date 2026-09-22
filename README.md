# DATAIZE Admin — LinkedIn SNS 운영 관리자

LinkedIn 계정으로 로그인해 **게시물을 작성하고 실제 LinkedIn 에 발행**하며,
발행 상태 · 성과 지표 · 유입(Lead) 현황을 한 화면에서 관리하는 운영자용 Admin 페이지입니다.

마케팅/운영 담당자(비개발 직군)가 개발자를 부르지 않고 스스로 문제를 확인하고 해결할 수 있는 것을
설계의 1순위 목표로 두었습니다.

---

## 1. 실행 방법

### 1-1. 사전 준비

| 항목 | 내용 |
|---|---|
| Node.js | 20 이상 |
| MongoDB | MongoDB Atlas 무료 클러스터(M0) 또는 로컬 MongoDB |
| LinkedIn | 개발자 앱 1개 (아래 1-2 참고) |

### 1-2. LinkedIn 개발자 앱 설정

1. [LinkedIn 회사 페이지](https://www.linkedin.com/company/setup/new/) 생성 — 앱 생성 시 필수입니다.
2. [개발자 앱 생성](https://www.linkedin.com/developers/apps/new) → 위 페이지를 연결하고 **Verify**.
3. **Products** 탭에서 아래 2개를 요청합니다. (둘 다 self-serve, 즉시 승인)
   - `Sign In with LinkedIn using OpenID Connect` → `openid` `profile` `email`
   - `Share on LinkedIn` → `w_member_social`
4. **Auth** 탭 → *Authorized redirect URLs* 에 다음을 등록합니다.
   ```
   http://localhost:3000/api/auth/linkedin/callback
   ```
5. **Client ID / Client Secret** 을 복사합니다.

### 1-3. 환경변수

> **평가용 빠른 실행** — 제출 메일에 동봉한 환경변수 내용을 프로젝트 루트에 `.env.local` 파일로
> 저장하시면 위 1-2 과정 없이 바로 실행하실 수 있습니다. (해당 자격증명은 과제 평가 전용이며
> 평가 종료 후 폐기 예정입니다.)

직접 설정하실 경우 아래를 따릅니다.

```bash
# macOS / Linux
cp .env.example .env.local
# Windows (PowerShell)
copy .env.example .env.local
```

실제 값은 `.env.local` 에만 넣습니다. `.env.example` 은 **필요한 변수 목록을 알려주는 견본**이므로
값이 비어 있는 상태로 커밋되며, `.env.local` 은 `.gitignore` 로 저장소에서 제외됩니다.

`SESSION_SECRET` 과 `TOKEN_ENCRYPTION_KEY` 는 아래 명령으로 **각각 따로** 생성해 넣습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1-4. 실행

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run test         # 핵심 로직 자체 검증 (상태머신 / 검증 스키마 / 암호화) — DB 불필요
npm run typecheck    # 타입 검사
npm run build        # 프로덕션 빌드
```

유입/Lead 화면은 실제 랜딩이 있어야 데이터가 쌓이므로, 화면 확인용 예시 데이터를 제공합니다.

```bash
npm run seed            # 최근 14일치 예시 리드 42건 생성 (.env.local 을 그대로 읽습니다)
```

---

## 2. 기술 스택과 선택 이유

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| 프레임워크 | **Next.js 15 (App Router)** | 화면과 API(Route Handlers)를 한 프로젝트에서 운영. LinkedIn **Client Secret 과 액세스 토큰이 서버에만 존재**해야 하는데, 서버 컴포넌트/라우트 핸들러가 이 경계를 자연스럽게 만들어 줍니다. |
| 언어 | **TypeScript (strict)** | 외부 API 응답과 DB 문서, 화면 모델의 형태를 타입으로 고정해 런타임 오류를 컴파일 시점으로 끌어올립니다. |
| UI | **React 19 + Tailwind CSS v4** | 디자인 토큰을 `globals.css` 한 곳에 정의해 "같은 의미는 항상 같은 색"이라는 UX 일관성을 코드로 강제합니다. |
| DB | **MongoDB (공식 드라이버)** | ODM(Mongoose) 대신 드라이버를 직접 사용해 **스키마 설계·인덱스·집계 파이프라인을 명시적으로** 드러냈습니다. |
| 검증 | **zod** | 프론트 폼 검증과 백엔드 API 검증이 **같은 스키마 하나**를 공유합니다. |
| 세션 | **jose (JWT) + httpOnly 쿠키** | 외부 세션 스토어 없이 동작하면서, 토큰은 쿠키에 담지 않습니다. |
| 차트 | 의존성 없이 직접 구현 | 단순 막대 차트 하나에 차트 라이브러리를 추가하지 않았습니다. |

> 별도 상태관리 라이브러리(Redux/Zustand)와 데이터 페칭 라이브러리(React Query)는 도입하지 않았습니다.
> 화면 간 공유 상태가 없고, 목록 필터 상태는 **URL 쿼리스트링을 단일 소스로** 사용하기 때문입니다.
> (덕분에 `/posts?status=FAILED` 같은 화면 상태를 그대로 공유·북마크할 수 있습니다.)

---

## 3. 프로젝트 구조 — 도메인 분리와 의존 방향

```
src/
├── app/                              # 라우팅 + Controller 역할만. 얇게 유지
│   ├── login/page.tsx
│   ├── (admin)/                      # 인증 가드가 걸린 관리자 영역
│   │   ├── layout.tsx                #   └ 비로그인 시 /login 리다이렉트
│   │   ├── dashboard/page.tsx
│   │   ├── posts/{page,new,[id]}
│   │   ├── leads/page.tsx
│   │   └── logs/page.tsx
│   └── api/                          # ← Node.js 백엔드 (Route Handlers)
│       ├── auth/linkedin/{route,callback}
│       ├── posts/{route,[id],[id]/publish}
│       ├── metrics/refresh
│       ├── analytics/summary
│       └── logs
│
├── entities/                         # 도메인 모델 — 무엇인가만 정의
│   ├── post.ts                       #   상태 정의 + 상태 전이 규칙
│   ├── lead.ts
│   └── user.ts
│
├── features/                         # ★ 도메인(기능) 단위 묶음
│   ├── posts/{api, components, model}
│   ├── analytics/components
│   └── auth/components
│
├── shared/                           # 도메인을 모르는 공용 자산
│   ├── ui/                           #   Button, Card, Badge, Modal, Toast, EmptyState…
│   ├── lib/                          #   api-response, http, format
│   └── config/env.ts
│
└── server/                           # ★ 서버 전용 (클라이언트 번들에 포함되지 않음)
    ├── db/mongo.ts                   #   커넥션 + 인덱스 정의
    ├── repositories/                 #   DB 접근 + 문서↔도메인 매핑
    ├── services/                     #   비즈니스 로직
    ├── linkedin/                     #   외부 API 어댑터
    └── auth/, crypto.ts
```

### 의존 방향 (단방향, 역류 금지)

```
app  →  features  →  entities  →  shared
 └──→  server  →  repositories → db
```

- `features/posts` 는 `features/leads` 를 **직접 import 하지 않습니다.** 필요하면 `app` 레이어에서 조합합니다.
- `shared` 는 어떤 도메인도 알지 못합니다.
- `entities` 는 DB 도 화면도 모릅니다. 그래서 `canTransition()` 같은 규칙을 **DB 없이 단위 테스트할 수 있습니다** (`npm run test`).

### Spring Boot 대응표 (구조 의도 참고용)

| 이 프로젝트 | Spring Boot |
|---|---|
| `app/api/**/route.ts` | `@RestController` |
| `server/services/` | `@Service` |
| `server/repositories/` | `@Repository` |
| `server/linkedin/` | 외부 API 클라이언트 |
| `entities/` | Domain / Entity |
| `shared/lib/api-response.ts` | `@RestControllerAdvice` + 공통 응답 DTO |

---

## 4. 실제 연동한 LinkedIn API 범위

| 기능 | Endpoint | 권한 | 상태 |
|---|---|---|---|
| OAuth 인증 | `GET /oauth/v2/authorization` | — | ✅ **실연동** |
| 토큰 교환 | `POST /oauth/v2/accessToken` | — | ✅ **실연동** |
| 프로필/식별자 조회 | `GET /v2/userinfo` | `openid` `profile` `email` | ✅ **실연동** |
| **게시물 발행** | `POST /rest/posts` | `w_member_social` | ✅ **실연동** |
| 게시물 상세 지표 | `GET /rest/memberCreatorPostAnalytics` | `r_member_postAnalytics` | ⚠️ **권한 심사 대기** |
| 반응·댓글 수 | `GET /rest/socialMetadata/{urn}` | `r_member_social_feed` | ⚠️ **권한 심사 대기** |

- 호출 헤더: `LinkedIn-Version: 202609`, `X-Restli-Protocol-Version: 2.0.0`
- 발행 응답의 게시물 URN 은 본문이 아니라 **응답 헤더 `x-restli-id`** 로 전달되며, 이를 저장해
  `https://www.linkedin.com/feed/update/{urn}` 형태의 실제 게시물 링크를 화면에 노출합니다.
- **Rate limit: 멤버당 1일 150회** — 이 제약이 아래 "지표 동기화 전략"의 근거입니다.

### ⚠️ 지표 권한에 대한 설계 판단

개인 계정 게시물의 노출수 등 상세 지표는 `r_member_postAnalytics` 권한이 필요하며,
이 권한은 self-serve 가 아니라 **LinkedIn 의 별도 심사**를 거칩니다.

승인 여부에 따라 애플리케이션을 다시 만들어야 한다면 잘못된 설계라고 판단하여,
지표 수집을 `MetricsProvider` 인터페이스로 추상화했습니다.

```
server/linkedin/metrics/
├── provider.ts            # 인터페이스
├── linkedinProvider.ts    # 실제 LinkedIn API 호출 (1차 analytics → 실패 시 2차 socialMetadata 폴백)
└── sampleProvider.ts      # 심사 대기 중 화면 검증용 대체 데이터
```

- `.env` 의 `METRICS_PROVIDER=linkedin | sample` 한 줄로 전환되며, **호출부 코드는 변경되지 않습니다.**
- 대체 데이터는 DB 에 `source: 'sample'` 로 기록되고, **화면에 항상 "샘플 데이터" 배지가 표시**됩니다.
  실제 수치인 것처럼 보이게 하지 않는 것이 더 중요하다고 판단했습니다.
- `sampleProvider` 는 난수가 아니라 게시물 ID 해시를 시드로 사용해, 새로고침해도 값이 흔들리지 않습니다.

---

## 5. 데이터 처리 방식

### 5-1. 경계에서의 검증 (Validation at the boundary)

들어오는 데이터는 사용자 입력이든 LinkedIn 응답이든 신뢰하지 않고, 경계에서 zod 로 파싱합니다.

| 경계 | 스키마 | 위치 |
|---|---|---|
| 사용자 입력 | `createPostSchema` | `features/posts/model/schema.ts` — **프론트 폼과 백엔드 API 가 공유** |
| LinkedIn 토큰 응답 | `tokenResponseSchema` | `server/linkedin/oauth.ts` |
| LinkedIn 프로필 응답 | `userInfoSchema` | `server/linkedin/oauth.ts` |
| LinkedIn 지표 응답 | `analyticsSchema` / `socialMetadataSchema` | `server/linkedin/metrics/` |
| 환경변수 | `envSchema` | `shared/config/env.ts` — 서버 기동 시점에 실패 |

외부 응답은 파싱 후 **내부 도메인 모델로 매핑**합니다(부패 방지 계층).
LinkedIn 이 필드명을 바꿔도 수정 지점은 이 매핑 함수 하나입니다.

### 5-2. 게시물 상태 머신

`status` 를 단순 문자열로 두면 "발행된 글을 초안으로 되돌리기" 같은 잘못된 변경을 막을 수 없습니다.
허용 전이를 데이터로 선언하고 서비스 계층에서 강제합니다. (`entities/post.ts`)

```
DRAFT ──┬──▶ SCHEDULED ──┐
        │                 ├──▶ PUBLISHING ──┬──▶ PUBLISHED  (종착: 되돌릴 수 없음)
        └─────────────────┘                 └──▶ FAILED ──▶ (재시도) PUBLISHING
```

### 5-3. 중복 발행 방지 (멱등성 · 동시성)

LinkedIn 게시는 **되돌릴 수 없는 작업**이므로 3중으로 막았습니다.

| 계층 | 방법 |
|---|---|
| UI | 게시 버튼 클릭 즉시 `disabled` + 확인 모달 |
| 서비스 | 이미 `PUBLISHED` 면 LinkedIn 을 호출하지 않고 `ALREADY_PUBLISHED` 반환 |
| DB | `findOneAndUpdate` 로 `status → PUBLISHING` 을 **원자적으로 선점**. 동시 요청 중 하나만 통과 |

```ts
// server/repositories/postRepository.ts — acquirePublishLock()
await col.findOneAndUpdate(
  { _id, userId, status: { $in: ['DRAFT', 'SCHEDULED', 'FAILED'] } },  // 조건이 곧 잠금
  { $set: { status: 'PUBLISHING', idempotencyKey }, $inc: { publishAttempts: 1 } },
);
```

### 5-4. MongoDB 스키마와 설계 근거

| 컬렉션 | 역할 | 설계 판단 |
|---|---|---|
| `users` | 관리자 계정 | `linkedinSub` unique — 로그인 시 upsert |
| `oauthTokens` | LinkedIn 액세스 토큰 | **users 에 임베딩하지 않음.** 생명주기(만료·갱신)가 다르고, 조회 경로를 분리해 노출면을 줄이기 위함 |
| `posts` | 게시물 | 상태·URN·실패사유·시도횟수를 한 문서에 |
| `postMetrics` | 지표 **스냅샷** | **posts 에 임베딩하지 않음.** 지표는 시간에 따라 반복 수집되는 시계열이라 임베딩하면 문서가 무한히 커지고, 추이 분석도 불가능해집니다 |
| `leads` | 유입/리드 | `referrerPostId` 로 게시물 성과와 연결 |
| `apiCallLogs` | LinkedIn 호출 로그 | TTL 인덱스로 **30일 후 자동 삭제** |

**인덱스** (`server/db/mongo.ts` 의 `ensureIndexes()`)

| 인덱스 | 목적 |
|---|---|
| `posts { userId, status, createdAt: -1 }` | 목록 화면의 상태 필터 + 최신순 정렬 |
| `posts { idempotencyKey }` *(partial unique)* | 값이 있을 때만 유일 — 멱등성 키 중복 방지 |
| `postMetrics { postId, collectedAt: -1 }` | 게시물별 최신 스냅샷 조회 |
| `apiCallLogs { createdAt }` *(TTL 30일)* | 로그 무한 증가 방지 |

### 5-5. 집계는 애플리케이션이 아니라 DB 에서

상태별 건수, 일자별 추이는 전부 MongoDB **aggregation pipeline** 으로 처리합니다.
목록 화면의 지표는 `$lookup` 으로 게시물당 최신 스냅샷 1건씩 한 번에 붙여 **N+1 조회를 제거**했습니다.

```ts
{ $group: { _id: '$status', count: { $sum: 1 } } }                      // 상태별 현황
{ $dateToString: { format: '%Y-%m-%d', date: '$publishedAt',
                   timezone: 'Asia/Seoul' } }                           // 일자별 추이 (KST 기준)
```

> 데이터가 없는 날도 0 으로 채워 반환합니다. 차트가 중간에 끊기면 "장애"로 오해하기 때문입니다.

### 5-6. 지표 동기화 전략 (수집과 조회의 분리)

LinkedIn 은 **멤버당 하루 150회** 호출 제한이 있습니다.
화면을 열 때마다 호출하면 운영 시간 중에 한도가 소진됩니다.

```
[수집]  POST /api/metrics/refresh  →  LinkedIn API  →  postMetrics 에 스냅샷 저장
[조회]  화면  →  우리 DB 만 읽음 (빠르고, 호출 한도와 무관)
```

화면에는 **"마지막 수집: N분 전"** 과 **[지금 새로고침]** 버튼을 함께 노출해,
운영자가 보고 있는 숫자가 언제 기준인지 항상 알 수 있게 했습니다.

### 5-7. 일관된 에러 처리

모든 API 는 동일한 형태로 응답합니다.

```ts
type ApiResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string; details?: unknown } };
```

LinkedIn 의 HTTP 상태코드는 도메인 에러 코드로 **번역**해서 내려보냅니다.
프론트는 `error.code` 로 분기해 **"무엇을 하면 되는지"** 까지 안내합니다 (`shared/lib/http.ts` 의 `hintFor`).

| LinkedIn | 에러 코드 | 사용자에게 보여주는 안내 |
|---|---|---|
| 401 | `LINKEDIN_TOKEN_EXPIRED` | 로그아웃 후 다시 로그인하면 해결됩니다 |
| 403 | `LINKEDIN_PERMISSION_DENIED` | 개발자 포털 Products 에서 승인 상태를 확인하세요 |
| 429 | `LINKEDIN_RATE_LIMITED` | 하루 150회 제한입니다. 시간을 두고 재시도하세요 |
| 5xx | `LINKEDIN_UNAVAILABLE` | 일시 장애입니다. [재시도]를 눌러주세요 |

재시도는 **429/5xx 에만** 지수 백오프(1s → 2s)로 수행합니다.
4xx 는 재시도해도 결과가 같으므로 즉시 실패 처리합니다.

### 5-8. 자격증명 보호

- 액세스 토큰은 **AES-256-GCM 으로 암호화**해 저장합니다 (`server/crypto.ts`).
  GCM 은 인증 암호화 모드라 **위·변조도 감지**합니다. (`npm run test` 로 검증)
- 토큰은 쿠키·응답 본문 어디에도 담기지 않습니다. 세션 쿠키에는 `userId`/`name` 만 들어갑니다.
- 세션 쿠키는 `httpOnly` + `sameSite=lax` + 프로덕션 `secure`.
- OAuth `state` 를 쿠키에 저장했다가 콜백에서 대조해 CSRF 를 방어합니다.
- API 호출 로그는 응답 본문을 800자로 잘라 저장합니다.

---

## 6. 운영을 고려한 UX 결정

화면을 그리기 전에, 운영 담당자의 실제 업무 흐름 3가지를 먼저 정의하고 거기에 맞춰 구성했습니다.

> **시나리오 1 — 게시하기**
> 글을 작성한다. 글자수가 LinkedIn 제한(3,000자)에 가까워지면 미리 색으로 경고한다.
> 오른쪽 미리보기로 실제 피드에서 어떻게 보일지 확인하고, "되돌릴 수 없습니다" 확인 모달을 거쳐 게시한다.
> 성공하면 토스트에 **실제 LinkedIn 게시물 링크**가 함께 떠서 바로 눈으로 확인할 수 있다.

> **시나리오 2 — 실패 복구**
> 출근해 대시보드를 연다. 화면 **최상단**에 "게시 실패 2건"이 뜨고, 클릭하면 `FAILED` 로 필터된 목록이 열린다.
> 목록에서 실패 사유가 바로 보이고, 같은 줄의 [재시도] 버튼으로 해결한다.
> 원인을 더 보고 싶으면 [연동 로그]에서 실제 요청·응답을 확인한다. **개발자를 부르지 않는다.**

> **시나리오 3 — 성과 확인**
> 주간 보고를 위해 대시보드에서 누적 성과와 14일 추이를 확인한다.
> 숫자 옆의 "마지막 수집: 12분 전"으로 최신성을 판단하고, 필요하면 [지금 새로고침]을 누른다.

### 구현한 UX 장치

| 영역 | 내용 |
|---|---|
| **정보 위계** | 대시보드 최상단은 숫자가 아니라 **"확인이 필요한 항목"** 배너. 조치할 게 없으면 그렇다고 명시 |
| **연결성** | 상태 카드 → 필터된 목록으로 이동. 필터 상태가 URL 에 남아 공유·북마크 가능 |
| **로딩** | 스피너 대신 **스켈레톤**. 버튼은 클릭 즉시 `disabled` (중복 게시 1차 차단) |
| **빈 상태** | "없습니다"에서 끝내지 않고 **다음 행동 버튼**을 함께 제시 ([첫 게시물 작성] / [필터 초기화]) |
| **에러 상태** | 원인 + **해결 방법** + [재시도] 버튼. 로그인 실패 사유도 화면에 그대로 노출 |
| **파괴적 행동** | 게시·삭제 전 확인 모달 + 본문 재확인. "되돌릴 수 없습니다" 명시 |
| **입력 보호** | 실시간 글자수 카운터(200자 남으면 주황, 초과하면 빨강), **자동 임시저장**(localStorage) |
| **데이터 정직성** | 샘플 데이터에는 항상 배지 표시. 실제 값처럼 위장하지 않음 |
| **일관성** | 상태 색은 `StatusBadge` **한 곳**에서만 정의 — 모든 화면에서 동일 |
| **접근성** | `label`–`input` 연결, `:focus-visible` 포커스 링, 토스트 `aria-live`, 모달 `role="dialog"`, 에러 `role="alert"`, `prefers-reduced-motion` 대응 |
| **반응형 / 테마** | 모바일 탭 네비게이션, 다크 모드 자동 대응 |

---

## 7. 알려진 제약

1. **지표 권한** — `r_member_postAnalytics` 심사 대기. 현재 기본값은 `METRICS_PROVIDER=sample` 입니다.
2. **Rate limit** — 멤버당 1일 150회. [지금 새로고침]은 최근 발행 50건까지만 조회합니다.
3. **예약 발행** — 예약 시각 저장과 상태 관리까지 구현했고, 자동 실행 스케줄러는 미구현입니다
   (아래 8번의 작업 큐 도입과 함께 설계해야 할 부분이라고 판단했습니다).
4. **리드 데이터** — 실제 랜딩 페이지가 범위 밖이라 `npm run seed` 로 예시 데이터를 제공합니다.
   스키마·집계·화면은 실제 데이터가 들어와도 그대로 동작합니다.
5. **단일 사용자 기준** — 모든 데이터가 로그인한 LinkedIn 계정 단위로 격리됩니다. 팀 단위 권한은 미구현입니다.

---

## 8. Production 환경으로 확장한다면

### 8-1. 신뢰성

- **작업 큐 도입** (BullMQ + Redis) — 예약 발행과 지표 수집을 워커로 분리.
  현재는 HTTP 요청 안에서 LinkedIn 을 호출하므로, 발행량이 늘면 응답 시간과 결합됩니다.
- **지표 수집 스케줄러** — 발행 직후 집중 수집 → 이후 간격을 늘리는 백오프 수집 정책.
- **Dead Letter Queue** — 재시도를 모두 소진한 발행 실패 건을 별도 큐에 모아 운영자가 일괄 처리.
- **토큰 자동 갱신** — 현재는 만료 시 재로그인을 안내합니다. refresh token 승인 시 자동 갱신으로 전환.

### 8-2. 보안

- 암호화 키를 **AWS KMS / Secrets Manager** 로 이관하고 키 로테이션 적용.
- **RBAC** — 운영자(작성·발행) / 뷰어(조회 전용) / 관리자 권한 분리.
- **감사 로그(Audit Log)** — 누가 언제 무엇을 발행·삭제했는지 별도 기록 (현재 로그는 API 호출 기준).
- 현재 MongoDB Atlas 네트워크는 과제 편의상 `0.0.0.0/0` 허용을 가정합니다. 운영에서는 VPC Peering / Private Endpoint 로 제한.

### 8-3. 확장성

- **멀티 채널** — `SocialProvider` 인터페이스를 추가해 X(Twitter), Threads, Instagram 으로 확장.
  현재 `MetricsProvider` 와 동일한 추상화 패턴을 재사용할 수 있습니다.
- **멀티 계정 / 조직 페이지** — Community Management API 승인 후 `urn:li:organization` 게시 지원.
- **콘텐츠 캘린더** — 예약 게시물을 월간 캘린더로 보는 뷰.
- **이미지/링크 첨부** — LinkedIn Images API 로 에셋 업로드 후 게시물에 연결.

### 8-4. 품질 / 운영

- **테스트 확대** — 현재 도메인 로직 자체 검증(`npm run test`)에 더해,
  `mongodb-memory-server` 기반 repository 통합 테스트와 Playwright E2E 추가.
- **관측성** — Sentry(에러) + 구조화 로깅 + LinkedIn 호출 성공률/지연 대시보드.
- **알림** — 게시 실패 시 Slack 웹훅으로 담당자에게 즉시 통보 (현재는 화면 확인 방식).
- **CI/CD** — GitHub Actions 에서 `typecheck → lint → test → build` 후 Vercel 배포.

---

## 9. 화면

| 경로 | 설명 |
|---|---|
| `/login` | LinkedIn OAuth 로그인 |
| `/dashboard` | 조치 필요 항목 · 상태별 현황 · 누적 성과 · 14일 추이 · 유입/리드 · 최근 게시물 |
| `/posts` | 상태 필터 · 검색 · 페이지네이션 · 게시/재시도/삭제 |
| `/posts/new`, `/posts/[id]` | 작성·수정(미리보기·글자수·임시저장) / 발행 후 읽기 전용 상세 |
| `/leads` | 유입 경로 분포 · 리드 상태별 현황 · 최근 유입 목록 |
| `/logs` | LinkedIn API 호출 기록 (요청·응답·소요시간·에러코드) |
