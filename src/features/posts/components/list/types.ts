import type { PostWithMetrics } from '@/entities/post';

/**
 * 목록에서 확인 모달을 거쳐 실행되는 동작 3종.
 *
 * 모두 되돌릴 수 없는 작업이라 곧바로 실행하지 않고,
 * 여기서 한 번 객체로 표현한 뒤 모달의 확인을 받아 처리합니다.
 */
export type PostActionKind =
  /** LinkedIn 에 실제로 발행 */
  | 'publish'
  /** LinkedIn 의 실제 게시물을 삭제 (기록은 REMOVED 로 보존) */
  | 'unpublish'
  /** 관리자 페이지의 기록을 삭제 (발행 전/실패/내려간 글만 가능) */
  | 'delete';

export interface PostAction {
  post: PostWithMetrics;
  kind: PostActionKind;
}
