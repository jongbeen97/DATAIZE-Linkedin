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
npm run seed            # 예시 데이터 생성 (.env.local 을 그대로 읽습니다)
npm run seed:clean      # 예시 데이터만 삭제
```

| 생성되는 데이터 | 수량 |
|---|---|
| 리드 | 42건 (최근 14일에 분산, 일부는 실제 발행 게시물에 유입 경로로 연결) |
| 게시물 | 7건 — `DRAFT` 3 · `SCHEDULED` 2 · `FAILED` 2 |

> **`PUBLISHED` 는 생성하지 않습니다.** 가짜 LinkedIn URN 을 넣으면 "실제로 발행한 것"처럼
> 보이게 되므로, 발행 완료 상태는 실제로 LinkedIn 에 올린 게시물만 갖습니다.
> `DRAFT`/`SCHEDULED`/`FAILED` 는 LinkedIn 에 닿은 적이 없는 로컬 상태라 예시로 만들어도 사실과 어긋나지 않습니다.
>
> 예시 데이터에는 `_seed: true` 표식이 붙습니다. `npm run seed:clean` 은 이 표식이 있는 문서만
> 지우므로, **직접 작성·발행한 데이터는 삭제되지 않습니다.**

---

## 2. 기술 스택과 선택 이유

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| 프레임워크 | **Next.js 16 (App Router)** | 화면과 API(Route Handlers)를 한 프로젝트에서 운영. LinkedIn **Client Secret 과 액세스 토큰이 서버에만 존재**해야 하는데, 서버 컴포넌트/라우트 핸들러가 이 경계를 자연스럽게 만들어 줍니다. |
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
│   ├── lib/                          #   api-response, http, format, date
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

### 타입이 구조를 강제합니다

상태·에러 코드처럼 "빠짐없이 다뤄야 하는" 목록은 `Record<PostStatus, T>` 형태로 선언했습니다.
덕분에 **목록에 항목을 추가하면 처리하지 않은 지점이 전부 컴파일 에러로 드러납니다.**

실제로 이번에 `REMOVED` 상태(5-3)를 추가했을 때 TypeScript 가 두 곳을 짚어 주었습니다.

```
StatusBadge.tsx    Property 'REMOVED' is missing in type ... Record<PostStatus, BadgeTone>
postRepository.ts  Property 'REMOVED' is missing in type ... Record<PostStatus, number>
```

상태를 늘리면서 뱃지 색 정의나 집계 초기값을 빠뜨리는 사고가 **구조적으로 불가능**합니다.
같은 방식으로 `ApiErrorCode → HTTP status` 매핑도 강제됩니다.

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
| **게시물 삭제** | `DELETE /rest/posts/{urn}` | `w_member_social` | ✅ **실연동** |
| 게시물 생존 확인 | `GET /rest/posts/{urn}` | 읽기 권한 필요 | ❌ **403 확인됨** (아래) |

**발행한 글조차 조회할 수 없습니다 — 실제로 호출해 확인했습니다**

현재 승인된 scope 는 `openid profile email w_member_social` 이며, `w_member_social` 은
**쓰기 전용**입니다. 우리가 직접 발행한 게시물을 되읽는 것도 거부됩니다.

```
GET /rest/posts/urn:li:share:7508071014522781696
→ HTTP 403 {"code":"ACCESS_DENIED",
            "message":"Not enough permissions to access: partnerApiPostsExternal.GET"}

GET /rest/socialMetadata/urn:li:share:7508071014522781696
→ HTTP 403 {"code":"ACCESS_DENIED",
            "message":"Not enough permissions to access: partnerApiSocialMetadata.GET"}
```

**그런데 삭제(DELETE)는 허용됩니다 — 권한이 메서드 단위입니다**

403 메시지를 자세히 보면 권한 키에 메서드 이름이 들어 있습니다.

```
Not enough permissions to access: partnerApiPostsExternal.GET.20260901
                                                           ^^^
```

`GET` 이 막힌 것이지 리소스 전체가 막힌 것이 아니라고 판단해 실제로 호출해 확인했습니다.

```
DELETE /rest/posts/{urn}   → 404 NOT_FOUND   (403 이 아님 = 권한 통과, 대상이 없을 뿐)
DELETE /v2/ugcPosts/{urn}  → 204 No Content
```

즉 `w_member_social` 하나로 **게시와 삭제가 모두 가능**하고, 읽기만 불가능합니다.
이 발견으로 관리자 페이지에서 실제 게시물을 내릴 수 있게 되었습니다 (5-3).

한편 조회가 막혀 있다는 사실은 여전히 유효하며, 이것이 지표 Provider 추상화와
"삭제 여부 자동 감지 불가"의 근거입니다.

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
        │                 ├──▶ PUBLISHING ──┬──▶ PUBLISHED ──▶ REMOVED  (종착)
        └─────────────────┘                 └──▶ FAILED ──▶ (재시도) PUBLISHING
```

| 상태 | 의미 | 수정 | 삭제 |
|---|---|---|---|
| `DRAFT` | 초안 | ✅ | ✅ |
| `SCHEDULED` | 예약 | ✅ | ✅ |
| `PUBLISHING` | 발행 중 (외부 호출 진행) | ❌ | ❌ |
| `PUBLISHED` | 발행 완료 | ❌ | ❌ |
| `REMOVED` | LinkedIn 에서 삭제됨 | ❌ | ✅ |

`PUBLISHED → REMOVED` 가 발행 이후의 **유일한 전이**입니다. 근거는 5-3 에 있습니다.

### 5-3. 외부 시스템과의 정합성 — 삭제하지 않고 "정정"합니다

LinkedIn 에 발행된 글은 **우리 DB 밖에 실체가 있습니다.** 두 방향 모두 문제가 생깁니다.

| 상황 | 순진한 처리 | 실제 결과 |
|---|---|---|
| 관리자가 발행된 글을 삭제 | `posts` 문서 삭제 | LinkedIn 에는 글이 그대로 남고, 성과 지표·호출 로그·리드 유입 경로의 연결만 끊김 |
| LinkedIn 에서 직접 글 삭제 | 아무 처리 없음 | 관리 화면에는 `PUBLISHED` 로 남아 링크가 404 |

그래서 두 방향을 각각 막았습니다.

**① 발행된 글은 관리 화면에서 삭제할 수 없습니다**

```ts
// entities/post.ts — 규칙을 도메인에 한 번만 정의
export function isDeletable(status: PostStatus): boolean {
  return status !== 'PUBLISHED' && status !== 'PUBLISHING';
}
```

이 함수 하나를 **화면(버튼 노출)과 서버(요청 거부)가 함께 사용**합니다.
버튼만 숨기면 API 를 직접 호출해 지울 수 있으므로, 서비스 계층에서도 같은 규칙으로 막습니다.

**② 발행된 글을 내릴 때는 LinkedIn 까지 함께 처리합니다**

관리자 페이지에서 기록만 지우면 LinkedIn 에는 글이 그대로 남습니다.
그래서 "내리기"를 **LinkedIn 삭제 + 상태 정정** 한 동작으로 묶었습니다.

```
[LinkedIn에서 삭제]
   └→ DELETE /rest/posts/{urn}     실제 게시물 삭제
   └→ status: PUBLISHED → REMOVED  우리 기록은 남김
```

**우리 DB 문서는 지우지 않습니다.** 그 글이 만들어 낸 성과 지표와 리드 유입 경로는
게시물이 내려간 뒤에도 유효한 데이터이기 때문입니다.
(*"9월에 올린 글이 리드 13건을 만들었다"* 는 기록은 글과 함께 사라지면 안 됩니다)

이미 LinkedIn 에서 지워진 글이면 `404` 가 돌아옵니다. 목적("LinkedIn 에 없게 한다")은
이미 달성된 상태이므로 실패로 보지 않고, 상태만 정정한 뒤 안내 문구만 다르게 합니다.

| LinkedIn 응답 | 처리 | 사용자 안내 |
|---|---|---|
| `204` | `REMOVED` 로 정정 | "LinkedIn 에서 게시물을 삭제했습니다" |
| `404` | `REMOVED` 로 정정 | "이미 삭제된 게시물이었습니다. 상태를 정정했습니다" |
| `401` / `403` | 상태 유지 | 재로그인 / 권한 확인 안내 |

**③ LinkedIn 에서 직접 지운 글은 자동 감지되지 않습니다**

LinkedIn 은 삭제 웹훅을 제공하지 않고, 조회는 403 이라 살아 있는 글과 삭제된 글을
구분할 수 없습니다(4장). `403` 을 삭제로 간주하면 멀쩡한 게시물까지 `REMOVED` 가 되므로,
**확인할 수 없는 것은 추측하지 않습니다.**

| 응답 | 의미 | 처리 |
|---|---|---|
| `404` / `410` | 원본이 삭제됨 | `REMOVED` 로 정정 |
| `403` | **확인 불가** (권한 없음) | 상태를 건드리지 않음 |

지표 수집 시 404 를 감지하는 경로는 이미 구현돼 있어, 읽기 권한이 승인되면 그대로 동작합니다.
그 전까지는 `[LinkedIn에서 삭제]` 가 같은 역할을 합니다 — 이미 지워진 글에 눌러도
404 를 받아 상태가 정정되기 때문입니다.

### 5-4. 중복 발행 방지 (멱등성 · 동시성)

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

### 5-5. MongoDB 스키마와 설계 근거

| 컬렉션 | 역할 | 설계 판단 |
|---|---|---|
| `users` | 관리자 계정 | `linkedinSub` unique — 로그인 시 upsert |
| `oauthTokens` | LinkedIn 액세스 토큰 | **users 에 임베딩하지 않음.** 생명주기(만료·갱신)가 다르고, 조회 경로를 분리해 노출면을 줄이기 위함 |
| `posts` | 게시물 | 상태·URN·실패사유·시도횟수를 한 문서에 |
| `postMetrics` | 지표 **스냅샷** | **posts 에 임베딩하지 않음.** 지표는 시간에 따라 반복 수집되는 시계열이라 임베딩하면 문서가 무한히 커지고, 추이 분석도 불가능해집니다. 게시물 삭제 시에는 함께 정리해 고아 문서가 남지 않게 합니다 |
| `leads` | 유입/리드 | `referrerPostId` 로 게시물 성과와 연결 |
| `apiCallLogs` | LinkedIn 호출 로그 | TTL 인덱스로 **30일 후 자동 삭제** |

**인덱스** (`server/db/mongo.ts` 의 `ensureIndexes()`)

| 인덱스 | 목적 |
|---|---|
| `posts { userId, status, createdAt: -1 }` | 목록 화면의 상태 필터 + 최신순 정렬 |
| `posts { idempotencyKey }` *(partial unique)* | 값이 있을 때만 유일 — 멱등성 키 중복 방지 |
| `postMetrics { postId, collectedAt: -1 }` | 게시물별 최신 스냅샷 조회 |
| `apiCallLogs { createdAt }` *(TTL 30일)* | 로그 무한 증가 방지 |

### 5-6. 집계는 애플리케이션이 아니라 DB 에서

상태별 건수, 일자별 추이는 전부 MongoDB **aggregation pipeline** 으로 처리합니다.
목록 화면의 지표는 `$lookup` 으로 게시물당 최신 스냅샷 1건씩 한 번에 붙여 **N+1 조회를 제거**했습니다.

```ts
{ $group: { _id: '$status', count: { $sum: 1 } } }                      // 상태별 현황
{ $dateToString: { format: '%Y-%m-%d', date: '$publishedAt',
                   timezone: 'Asia/Seoul' } }                           // 일자별 추이 (KST 기준)
```

> 데이터가 없는 날도 0 으로 채워 반환합니다. 차트가 중간에 끊기면 "장애"로 오해하기 때문입니다.

**일자별 집계의 함정 — 타임존을 한 곳으로 모았습니다**

DB 는 `$dateToString(timezone: 'Asia/Seoul')` 로 KST 날짜 키를 만드는데,
애플리케이션이 `Date.toISOString()` 으로 빈 날짜를 채우면 **UTC 키**가 만들어집니다.
KST 00:00 은 전날 15:00 UTC 이므로 두 키가 하루씩 어긋나고, 결과적으로 **오늘 데이터가 통째로 사라집니다.**

```
집계가 만드는 키 (KST)   2026-09-22   ← 오늘 유입 10건
차트가 만드는 키 (UTC)   2026-09-21   ← 매칭 실패 → 0 으로 표시
```

그래서 두 곳이 같은 기준을 쓰도록 `shared/lib/date.ts` 로 일원화했습니다.

```ts
export const REPORT_TIMEZONE = 'Asia/Seoul';
export function toDateKey(date: Date, tz = REPORT_TIMEZONE): string   // 'YYYY-MM-DD'
export function recentDateKeys(days: number): string[]                // 최근 N일 키
export function fillDailySeries(rows, days)                           // 빈 날짜 0 채우기
```

`npm run test` 의 `[4]` 블록이 이 경계를 검증합니다 (UTC 로 자르면 전날이 되는 케이스 포함).

### 5-7. 지표 동기화 전략 (수집과 조회의 분리)

LinkedIn 은 **멤버당 하루 150회** 호출 제한이 있습니다.
화면을 열 때마다 호출하면 운영 시간 중에 한도가 소진됩니다.

```
[수집]  POST /api/metrics/refresh  →  LinkedIn API  →  postMetrics 에 스냅샷 저장
[조회]  화면  →  우리 DB 만 읽음 (빠르고, 호출 한도와 무관)
```

화면에는 **"마지막 수집: N분 전"** 과 **[지금 새로고침]** 버튼을 함께 노출해,
운영자가 보고 있는 숫자가 언제 기준인지 항상 알 수 있게 했습니다.

### 5-8. 쌓은 데이터를 실제로 쓰기 — 스냅샷 활용

지표를 시계열로 저장(5-5)한 목적은 "추이를 볼 수 있게 하는 것"입니다.
쌓아두고 최신 1건만 읽으면 설계의 의미가 사라지므로, 누적된 스냅샷에서 세 가지를 만들었습니다.

**① 증감 — 목록·상세**

```
노출  2,233  ▲ 376     ← 직전 수집 대비
```

운영자에게는 "지금 몇인가"보다 **"늘고 있는가"** 가 더 필요한 정보입니다.
목록에서는 게시물마다 따로 조회하면 N+1 이 되므로, 기존 `$lookup` 의
`$limit: 1` 을 `2` 로 바꿔 **쿼리 수를 늘리지 않고** 증감을 얻었습니다.

```ts
// postRepository.listPosts()
pipeline: [
  { $match: { $expr: { $eq: ['$postId', '$$pid'] } } },
  { $sort: { collectedAt: -1 } },
  { $limit: 2 },        // 최신 + 직전
]
```

**② 추이 스파크라인 — 상세**

```
노출 추이                    4회 수집
 ▁▃▅█
927                      2,233
```

축과 눈금이 없는 초소형 꺾은선입니다. 값을 읽는 차트가 아니라
**"올라가고 있나"만 답하는** 용도라 `Sparkline` 으로 따로 만들었습니다.

**③ 노출 → 리드 전환율 — 대시보드**

과제의 *"게시물 별 기본 성과 지표"* 와 *"최근 유입 및 회원/Lead 현황"* 이 만나는 지점입니다.

| 게시물 | 노출 | 반응 | 유입 리드 | 전환율 |
|---|---:|---:|---:|---:|
| 테스트 | 972 | 15 | 4 | 0.41% |
| test2 | 2,086 | 51 | 8 | 0.38% |
| DATAIZE Admin 연동 테스트 | 2,233 | 94 | 7 | 0.31% |

`postMetrics`(성과)와 `leads.referrerPostId`(유입)를 이어 만듭니다.
둘을 따로 보여주면 *"많이 보였다"* 까지만 알 수 있고,
**"그 글이 실제로 고객을 데려왔는가"** 에는 답하지 못합니다.
노출이 가장 많은 글이 전환율 1위가 아니라는 점이 이 표의 존재 이유입니다.

> **집계 대상과 수집 대상은 다릅니다.**
> 지표 *수집* 은 실제 조회가 가능한 `PUBLISHED` 만 대상으로 하지만,
> *집계* 는 `REMOVED` 까지 포함합니다. LinkedIn 에서 내려간 글도 그동안 만들어 낸
> 노출·리드는 유효한 기록이라, 빼버리면 글을 내리는 순간 누적 성과가 갑자기 줄어듭니다.
> (`findPostIdsForAnalytics` vs `refreshAllMetrics`)

### 5-9. 일관된 에러 처리

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
| 404 / 410 | `LINKEDIN_NOT_FOUND` | 원본이 삭제된 글입니다 → 상태를 `REMOVED` 로 정정 (5-3) |
| 429 | `LINKEDIN_RATE_LIMITED` | 하루 150회 제한입니다. 시간을 두고 재시도하세요 |
| 5xx | `LINKEDIN_UNAVAILABLE` | 일시 장애입니다. [재시도]를 눌러주세요 |

재시도는 **429/5xx 에만** 지수 백오프(1s → 2s)로 수행합니다.
4xx 는 재시도해도 결과가 같으므로 즉시 실패 처리합니다.

### 5-10. 자격증명 보호

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
| **되돌릴 수 없는 것은 아예 막음** | 발행된 글에는 삭제 버튼을 노출하지 않습니다. 확인 모달보다 **선택지를 없애는 것**이 확실합니다 (5-3) |
| **불일치를 숨기지 않음** | LinkedIn 에서 삭제된 글은 `LinkedIn 삭제됨` 뱃지로 표시하고 링크를 감춥니다. 죽은 링크를 그대로 두지 않습니다 |
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
6. **LinkedIn 에서 직접 지운 글은 자동 감지되지 않습니다** — 삭제 웹훅이 없고,
   `w_member_social` 은 쓰기 전용이라 게시물 조회가 403 입니다(4장). 살아 있는 글과
   삭제된 글을 구분할 수 없어 403 을 삭제로 간주하지 않습니다.
   관리자 페이지의 `[LinkedIn에서 삭제]` 를 사용하면 이미 지워진 글에도 404 를 받아
   상태가 정정되므로 실무상 문제는 없습니다. 읽기 권한 승인 시 자동 감지가 동작합니다 (9-1).

---

## 8. 트러블슈팅 기록

개발하면서 실제로 막혔던 지점과, 원인을 어떻게 좁혀 해결했는지 남깁니다.
증상보다 **왜 그랬는지** 와 **무엇으로 재발을 막았는지** 를 중심으로 적었습니다.

### 8-1. LinkedIn 삭제 API — 403 을 만나고 포기할 뻔한 것

**증상** — 게시물 조회(`GET /rest/posts/{urn}`)가 403 이라 "읽기 권한이 없으니
삭제도 안 되겠다"고 판단할 뻔했습니다.

**단서** — 에러 메시지의 권한 키에 **메서드 이름**이 들어 있었습니다.

```
Not enough permissions to access: partnerApiPostsExternal.GET.20260901
                                                           ^^^
```

리소스 전체가 막힌 게 아니라 `GET` 만 막혔을 가능성이 있다고 보고 직접 호출해 확인했습니다.

```
DELETE /rest/posts/{urn}   → 404 NOT_FOUND    (403 이 아님 = 권한 통과)
DELETE /v2/ugcPosts/{urn}  → 204 No Content
```

**결과** — `w_member_social` 하나로 게시와 삭제가 모두 가능하고 읽기만 불가능했습니다.
덕분에 관리자 페이지에서 실제 게시물을 내리는 기능(5-3)을 구현할 수 있었습니다.

**배운 것** — 외부 API 의 에러 메시지는 "안 된다"가 아니라 **"무엇이 왜 안 되는지"** 를
담고 있습니다. 문구를 그대로 읽는 것만으로 가정 하나가 뒤집혔습니다.

---

### 8-2. 차트에 오늘 데이터가 사라진 문제 — 타임존 키 불일치

**증상** — 최근 14일 차트에서 오늘 유입 10건이 통째로 0 으로 표시됐습니다.

**원인** — 집계와 차트가 **서로 다른 타임존 기준**으로 날짜 키를 만들고 있었습니다.

```
DB 집계   $dateToString({ timezone: 'Asia/Seoul' })  →  '2026-09-22'
앱 채우기 Date.toISOString().slice(0, 10)            →  '2026-09-21'  ← UTC
```

KST 00:00 은 전날 15:00 UTC 입니다. 14일 전체가 하루씩 밀렸고,
목록에 없는 '오늘' 키는 매칭에 실패해 데이터가 사라졌습니다.

| | 합계 | 실제 |
|---|---|---|
| 수정 전 | 32 | 42 |
| 수정 후 | 42 | 42 |

**해결** — `shared/lib/date.ts` 로 타임존 기준을 일원화하고,
집계와 차트가 같은 `toDateKey()` 를 쓰도록 했습니다.

**재발 방지** — `npm run test` 의 `[4]` 블록에 회귀 테스트를 넣었습니다.
버그를 재현하는 케이스를 그대로 테스트로 남겼습니다.

```
✅ KST 새벽 1시 -> '2026-09-22'
✅ 같은 시각을 UTC 로 자르면 전날이 됨 (버그 재현)
```

---

### 8-3. 막대 차트가 한 번도 그려지지 않았던 문제 — CSS 퍼센트 높이

**증상** — 축 라벨은 나오는데 막대가 전혀 보이지 않았습니다.
빈 상태 문구도 뜨지 않아 데이터는 들어가고 있는 것이 확실했습니다.

**원인** — 퍼센트 높이가 해석될 기준을 잃었습니다.

```html
<div class="flex items-end" style="height:160px">   <!-- 부모: 높이 확정 -->
  <div class="flex flex-col justify-end">           <!-- 열: 높이 auto ❗ -->
    <div style="height:62%"/>                       <!-- 62% 가 무엇의 62%? -->
```

`align-items: flex-end` 는 **flex 아이템을 늘리지 않습니다.** 열의 높이가 내용 기준(`auto`)이
되고, CSS 에서 `height: %` 는 부모 높이가 확정일 때만 해석되므로 막대가 0 으로 무너졌습니다.

**해결** — 퍼센트 대신 px 로 직접 계산했습니다. 픽셀 값은 부모 높이와 무관하게 해석됩니다.

```ts
const barPx = d.count > 0 ? Math.max(Math.round((d.count / max) * height), 4) : 1;
```

같이 개선한 것: 값이 있으면 **최소 4px 을 보장**해 1건도 보이게 하고,
0 인 날은 **회색 1px 기준선**을 남겨 '데이터 없음'과 '차트 끊김'을 구분했습니다.

---

### 8-4. 발행된 게시물이 사라진 문제 — 되돌릴 수 없는 삭제를 막지 않았다

**증상** — 실제로 LinkedIn 에 발행한 게시물의 DB 기록이 두 차례 사라졌습니다.
`postMetrics` 와 `apiCallLogs` 는 남고 `posts` 문서만 없어졌습니다.

**원인** — 목록 화면에서 `PUBLISHED` 게시물에도 삭제 버튼이 노출되고 있었습니다.

```tsx
{post.status !== 'PUBLISHING' && <Button>삭제</Button>}   // PUBLISHED 가 걸러지지 않음
```

게다가 `LinkedIn ↗` 버튼 바로 옆에 같은 `ghost` 스타일로 붙어 있었습니다.

**왜 애초에 막았어야 하는가** — 글은 LinkedIn 에 그대로 살아 있는데 관리 기록만 지우면,
실제 게시물은 남은 채 성과 지표 · 호출 로그 · 리드 유입 경로의 연결만 끊깁니다.
상태 머신에서 `PUBLISHED` 를 종착역으로 둔 것과 같은 이유입니다.

**해결** — 삭제 가능 여부를 도메인 규칙으로 정의하고, **화면과 서버가 같은 함수**를 쓰게 했습니다.

```ts
// entities/post.ts
export function isDeletable(status: PostStatus): boolean {
  return status !== 'PUBLISHED' && status !== 'PUBLISHING';
}
```

버튼만 숨기면 API 를 직접 호출해 지울 수 있으므로 서비스 계층에서도 같은 규칙으로 거부합니다.
대신 "실제로 내리기"는 LinkedIn 삭제까지 함께 처리하는 별도 동작으로 분리했습니다(5-3).

**같이 고친 것** — `deletePost()` 가 게시물만 지우고 `postMetrics` 를 남겨
고아 문서가 쌓이고 있었습니다. 삭제 시 함께 정리하도록 바꿨습니다.

---

### 8-5. 시계열로 설계해놓고 최신 1건만 쓰고 있던 문제

**증상** — 기능 결함은 아니지만, `postMetrics` 를 시계열로 분리해놓고
화면에서는 `findLatestMetrics()` 로 **최신 1건만** 읽고 있었습니다.
README 에 "추이 분석이 가능하다"고 써두고 추이를 보여주지 않는 상태였습니다.

**해결** — 누적된 스냅샷에서 증감 · 추이 스파크라인 · 노출 대비 리드 전환율을
만들어 화면에 연결했습니다 (5-8).

**과정에서 드러난 설계 결함** — 집계 대상을 `PUBLISHED` 로만 잡고 있어,
글을 LinkedIn 에서 내리면 누적 성과가 갑자기 줄어드는 문제가 있었습니다.
`REMOVED` 까지 포함하도록 고쳤습니다.

```
지표 수집 → PUBLISHED 만        (실제 조회가 가능한 글)
성과 집계 → PUBLISHED + REMOVED  (과거 성과는 내려간 뒤에도 유효)
```

**배운 것** — "데이터를 어떻게 저장할 것인가"를 정했다면
**"그래서 그걸로 무엇을 보여줄 것인가"** 까지 가야 설계가 완성됩니다.
저장 구조만 좋고 화면이 안 쓰면 그냥 쌓이기만 하는 데이터입니다.

---

## 9. Production 환경으로 확장한다면

### 9-1. 신뢰성

- **작업 큐 도입** (BullMQ + Redis) — 예약 발행과 지표 수집을 워커로 분리.
  현재는 HTTP 요청 안에서 LinkedIn 을 호출하므로, 발행량이 늘면 응답 시간과 결합됩니다.
- **지표 수집 스케줄러** — 발행 직후 집중 수집 → 이후 간격을 늘리는 백오프 수집 정책.
- **Dead Letter Queue** — 재시도를 모두 소진한 발행 실패 건을 별도 큐에 모아 운영자가 일괄 처리.
- **토큰 자동 갱신** — 현재는 만료 시 재로그인을 안내합니다. refresh token 승인 시 자동 갱신으로 전환.
- **정합성 동기화 배치** — 발행된 게시물의 생존 여부를 주기적으로 확인해 `REMOVED` 를 자동 반영.
  현재는 운영자가 [지금 새로고침]을 눌러야 감지됩니다 (7-6).

### 9-2. 보안

- 암호화 키를 **AWS KMS / Secrets Manager** 로 이관하고 키 로테이션 적용.
- **RBAC** — 운영자(작성·발행) / 뷰어(조회 전용) / 관리자 권한 분리.
- **감사 로그(Audit Log)** — 누가 언제 무엇을 발행·삭제했는지 별도 기록 (현재 로그는 API 호출 기준).
- 현재 MongoDB Atlas 네트워크는 과제 편의상 `0.0.0.0/0` 허용을 가정합니다. 운영에서는 VPC Peering / Private Endpoint 로 제한.

### 9-3. 확장성

- **멀티 채널** — `SocialProvider` 인터페이스를 추가해 X(Twitter), Threads, Instagram 으로 확장.
  현재 `MetricsProvider` 와 동일한 추상화 패턴을 재사용할 수 있습니다.
- **멀티 계정 / 조직 페이지** — Community Management API 승인 후 `urn:li:organization` 게시 지원.
- **콘텐츠 캘린더** — 예약 게시물을 월간 캘린더로 보는 뷰.
- **이미지/링크 첨부** — LinkedIn Images API 로 에셋 업로드 후 게시물에 연결.

### 9-4. 품질 / 운영

- **테스트 확대** — 현재 도메인 로직 자체 검증(`npm run test`)에 더해,
  `mongodb-memory-server` 기반 repository 통합 테스트와 Playwright E2E 추가.
- **관측성** — Sentry(에러) + 구조화 로깅 + LinkedIn 호출 성공률/지연 대시보드.
- **알림** — 게시 실패 시 Slack 웹훅으로 담당자에게 즉시 통보 (현재는 화면 확인 방식).
- **CI/CD** — GitHub Actions 에서 `typecheck → lint → test → build` 후 Vercel 배포.
- **ESLint 도입** — 현재는 `tsc --noEmit`(타입)과 `npm run test`(도메인 로직)로 검증합니다.
  `any` 는 사용하지 않았으나(전수 확인), `@typescript-eslint/no-explicit-any` 규칙으로
  **금지를 코드로 강제**하고 React Hooks 의존성 배열 검사를 추가하는 것이 다음 단계입니다.

---

## 10. 화면

| 경로 | 설명 |
|---|---|
| `/login` | LinkedIn OAuth 로그인 |
| `/dashboard` | 조치 필요 항목 · 상태별 현황 · 누적 성과 · 14일 추이 · 유입/리드 · 최근 게시물 |
| `/posts` | 상태 필터 · 검색 · 페이지네이션 · 게시 / 재시도 / 삭제 / LinkedIn에서 삭제 |
| `/posts/new`, `/posts/[id]` | 작성·수정(미리보기·글자수·임시저장) / 발행 후 읽기 전용 상세 |
| `/leads` | 유입 경로 분포 · 리드 상태별 현황 · 최근 유입 목록 |
| `/logs` | LinkedIn API 호출 기록 (요청·응답·소요시간·에러코드) |

---

## 11. 검증

DB 와 외부 API 없이 도메인 로직을 검증합니다. 실행에 약 1초 걸립니다.

```bash
npm run test
```

| 블록 | 검증 내용 |
|---|---|
| `[1]` 상태 전이 | 허용/차단 전이, 수정·삭제 가능 여부, `PUBLISHED → REMOVED` 예외 |
| `[2]` 입력 검증 | 3,000자 초과, 빈 제목, 예약 시각 누락·과거 시각 |
| `[3]` 토큰 암호화 | 원문 비노출, 복호화 일치, IV 무작위성, GCM 변조 탐지 |
| `[4]` 일자별 집계 키 | 타임존 경계 — UTC 로 자르면 전날이 되는 케이스 포함 |

```
결과: 38 통과 / 0 실패
```

`[4]` 는 실제로 발생했던 버그(오늘 데이터가 차트에서 누락)를 재현하는 회귀 테스트입니다.
