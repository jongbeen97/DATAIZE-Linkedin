import type { MetricsSource } from '@/entities/post';

/**
 * 지표 수집 전략 추상화.
 *
 * ── 왜 인터페이스로 뺐는가 ────────────────────────────────────────
 * 개인 계정 게시물의 상세 지표(노출수 등)를 주는
 *   GET /rest/memberCreatorPostAnalytics  는 r_member_postAnalytics 권한이 필요하고,
 * 이 권한은 LinkedIn 의 별도 심사를 거쳐야 합니다.
 *
 * 심사 결과에 따라 애플리케이션 전체를 다시 짜야 한다면 잘못된 설계입니다.
 * 그래서 "지표를 가져오는 방법"을 인터페이스로 분리하고,
 * 환경변수 METRICS_PROVIDER 로 구현체만 교체합니다.
 *   - linkedin : 실제 LinkedIn API 호출
 *   - sample   : 승인 대기 중 UI 검증용 대체 데이터 (화면에 '샘플' 배지 노출)
 *
 * 권한이 승인되면 .env 한 줄만 바꾸면 실연동으로 전환됩니다.
 * ────────────────────────────────────────────────────────────────
 */

export interface RawPostMetrics {
  impressions: number;
  membersReached: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
  source: MetricsSource;
}

export interface MetricsProvider {
  readonly source: MetricsSource;
  fetchPostMetrics(input: {
    userId: string;
    postId: string;
    postUrn: string;
    publishedAt: string | null;
  }): Promise<RawPostMetrics>;
}
