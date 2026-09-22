/**
 * 게시물 도메인 모델
 *
 * 이 파일은 "게시물이란 무엇인가"만 정의합니다.
 * DB 접근(repository)도, 화면(component)도 이 파일을 모릅니다. → 단방향 의존
 */

/* ------------------------------------------------------------------ *
 * 1. 상태(Status) 정의
 * ------------------------------------------------------------------ */

export const POST_STATUSES = [
  'DRAFT', // 초안 — 작성만 하고 아직 발행하지 않음
  'SCHEDULED', // 예약 — 지정 시각에 발행 예정
  'PUBLISHING', // 발행 중 — LinkedIn API 호출 진행 중 (중복 발행 차단 구간)
  'PUBLISHED', // 발행 완료 — LinkedIn URN 확보됨
  'FAILED', // 발행 실패 — 사유가 failReason 에 기록됨
  'REMOVED', // LinkedIn 에서 삭제됨 — 성과·리드 기록은 보존한 채 상태만 정정
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: '초안',
  SCHEDULED: '예약',
  PUBLISHING: '발행 중',
  PUBLISHED: '발행 완료',
  FAILED: '실패',
  REMOVED: 'LinkedIn 삭제됨',
};

/**
 * 상태 색 토큰.
 *
 * 실제 색값은 globals.css 의 CSS 변수에만 있습니다. 여기서는 "어느 변수를 쓸지"만
 * 정의해, 뱃지 · 분포 막대 · 차트가 모두 같은 출처를 바라보게 합니다.
 * 라이트/다크 테마 전환도 CSS 변수 쪽에서만 처리됩니다.
 */
export const POST_STATUS_COLOR: Record<PostStatus, string> = {
  DRAFT: 'var(--status-draft)',
  SCHEDULED: 'var(--status-scheduled)',
  PUBLISHING: 'var(--status-publishing)',
  PUBLISHED: 'var(--status-published)',
  FAILED: 'var(--status-failed)',
  REMOVED: 'var(--status-removed)',
};

/**
 * 상태 전이 규칙(State Machine).
 *
 * status 를 단순 string 으로 두면 "PUBLISHED 인 글을 다시 DRAFT 로" 같은
 * 잘못된 변경을 코드가 막아주지 못합니다. 허용 전이를 데이터로 선언해 두고
 * 서비스 계층에서 반드시 canTransition() 을 통과하도록 강제합니다.
 */
const ALLOWED_TRANSITIONS: Record<PostStatus, readonly PostStatus[]> = {
  DRAFT: ['SCHEDULED', 'PUBLISHING'],
  SCHEDULED: ['PUBLISHING', 'DRAFT'],
  PUBLISHING: ['PUBLISHED', 'FAILED'],
  // 발행된 글은 우리가 되돌릴 수 없다. 단 하나의 예외가 LinkedIn 쪽에서
  // 직접 삭제된 경우이며, 이때만 REMOVED 로 상태를 정정한다.
  PUBLISHED: ['REMOVED'],
  FAILED: ['PUBLISHING', 'DRAFT'], // 재시도 또는 초안으로 되돌리기
  REMOVED: [], // 종착역 — 원본이 사라졌으므로 되살릴 수 없다
};

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** 편집(내용 수정)이 가능한 상태인지 */
export function isEditable(status: PostStatus): boolean {
  return status === 'DRAFT' || status === 'SCHEDULED' || status === 'FAILED';
}

/**
 * 관리자 페이지에서 삭제할 수 있는 상태인지.
 *
 * PUBLISHED 를 제외하는 이유: 글은 LinkedIn 에 그대로 살아 있는데 관리 기록만
 * 사라지면, 실제 게시물은 남은 채 성과 지표 / 호출 로그 / 리드 유입 경로의
 * 연결이 끊깁니다. 실제로 내리려면 LinkedIn 에서 직접 삭제해야 합니다.
 * PUBLISHING 은 외부 호출이 진행 중이라 결과를 확정한 뒤에만 다룹니다.
 *
 * REMOVED 는 원본이 이미 LinkedIn 에서 사라진 상태이므로 삭제를 허용합니다.
 * (그래도 기본은 '보관' — 지우면 그 글이 만든 리드 기록까지 함께 사라집니다)
 */
export function isDeletable(status: PostStatus): boolean {
  return status !== 'PUBLISHED' && status !== 'PUBLISHING';
}

/** LinkedIn 에 실제 게시물이 살아 있는 상태인지 (링크를 열어볼 수 있는지) */
export function isLiveOnLinkedIn(status: PostStatus): boolean {
  return status === 'PUBLISHED';
}

/* ------------------------------------------------------------------ *
 * 2. 도메인 엔티티
 * ------------------------------------------------------------------ */

/** LinkedIn 본문 최대 길이 (플랫폼 제약) */
export const LINKEDIN_MAX_CONTENT_LENGTH = 3000;

export type PostVisibility = 'PUBLIC' | 'CONNECTIONS';

export interface Post {
  id: string;
  userId: string;

  title: string; // 내부 관리용 제목 (LinkedIn 에는 전송되지 않음)
  content: string; // 실제 LinkedIn 본문
  visibility: PostVisibility;

  status: PostStatus;
  scheduledAt: string | null; // ISO 8601

  /** 중복 발행 방지 키. 발행 시도 전에 생성해 DB 에 먼저 기록한다. */
  idempotencyKey: string | null;

  /** 발행 성공 시에만 채워진다 */
  linkedinUrn: string | null; // 예: urn:li:share:7123456789
  linkedinUrl: string | null; // 예: https://www.linkedin.com/feed/update/urn:li:share:...
  publishedAt: string | null;

  /** 발행 실패 시에만 채워진다 */
  failReason: string | null;
  failCode: string | null;
  publishAttempts: number;

  createdAt: string;
  updatedAt: string;
}

/** 목록/대시보드에서 지표까지 함께 보여줄 때 쓰는 조회 모델 */
export interface PostWithMetrics extends Post {
  metrics: PostMetricsSnapshot | null;
}

/* ------------------------------------------------------------------ *
 * 3. 지표(Metrics)
 * ------------------------------------------------------------------ */

/** 지표의 출처. 화면에 반드시 표시해 '실연동'과 '대체 데이터'를 구분한다. */
export type MetricsSource = 'linkedin' | 'sample';

export interface PostMetricsSnapshot {
  postId: string;
  collectedAt: string;
  source: MetricsSource;

  impressions: number; // 노출수
  membersReached: number; // 도달 (고유 조회자)
  reactions: number; // 반응
  comments: number; // 댓글
  shares: number; // 리셰어
  clicks: number; // 링크 클릭
}

export function engagementRate(m: PostMetricsSnapshot): number {
  if (m.impressions <= 0) return 0;
  return ((m.reactions + m.comments + m.shares) / m.impressions) * 100;
}
