import { createHash } from 'node:crypto';
import type { MetricsProvider, RawPostMetrics } from './provider';

/**
 * LinkedIn 지표 권한(r_member_postAnalytics) 심사 대기 중 사용하는 대체 구현체.
 *
 * ⚠️ 이 값은 실제 LinkedIn 수치가 아닙니다.
 *    - 저장 시 source: 'sample' 로 기록되고
 *    - 화면에는 "샘플 데이터" 배지가 항상 함께 표시됩니다.
 *
 * 난수 대신 postId 해시를 시드로 쓰기 때문에, 새로고침해도 같은 게시물은
 * 같은 값이 나옵니다. (숫자가 매번 바뀌면 화면 검증을 할 수 없습니다)
 * 게시 후 경과 시간에 비례해 노출수가 자연스럽게 증가하도록 했습니다.
 */
export class SampleMetricsProvider implements MetricsProvider {
  readonly source = 'sample' as const;

  async fetchPostMetrics(input: {
    userId: string;
    postId: string;
    postUrn: string;
    publishedAt: string | null;
  }): Promise<RawPostMetrics> {
    const seed = seedFrom(input.postId);

    const hoursSincePublish = input.publishedAt
      ? Math.max(1, (Date.now() - new Date(input.publishedAt).getTime()) / 3_600_000)
      : 1;
    // 초반에 빠르게 늘고 이후 완만해지는 실제 노출 곡선을 단순 근사
    const growth = Math.min(1, Math.log10(hoursSincePublish + 1) / 2);

    const impressions = Math.round((300 + (seed % 2200)) * (0.3 + growth));
    const membersReached = Math.round(impressions * (0.72 + ((seed >> 3) % 15) / 100));
    const reactions = Math.round(impressions * (0.02 + ((seed >> 5) % 40) / 1000));
    const comments = Math.round(reactions * (0.08 + ((seed >> 7) % 20) / 100));
    const shares = Math.round(reactions * 0.12);
    const clicks = Math.round(impressions * (0.01 + ((seed >> 9) % 25) / 1000));

    return {
      impressions,
      membersReached,
      reactions,
      comments,
      shares,
      clicks,
      source: 'sample',
    };
  }
}

function seedFrom(value: string): number {
  const hash = createHash('sha256').update(value).digest();
  return hash.readUInt32BE(0);
}
