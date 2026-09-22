import { z } from 'zod';
import { linkedinFetch } from '../client';
import type { MetricsProvider, RawPostMetrics } from './provider';

/**
 * 실제 LinkedIn API 로 지표를 조회하는 구현체.
 *
 * 1차: GET /rest/memberCreatorPostAnalytics  (노출/도달/클릭까지)  ← r_member_postAnalytics 필요
 * 2차: GET /rest/socialMetadata/{urn}        (반응/댓글 수만)      ← 1차 실패 시 폴백
 *
 * 1차가 권한 부족(403)으로 막혀도 2차로 반응·댓글은 확보해
 * "아무 지표도 못 본다"는 상황을 피합니다.
 */

const analyticsSchema = z.object({
  elements: z
    .array(
      z.object({
        metricType: z.string().optional(),
        metricValue: z.number().optional(),
      }),
    )
    .optional(),
});

const socialMetadataSchema = z.object({
  reactionSummaries: z.record(z.object({ count: z.number() })).optional(),
  commentSummary: z.object({ count: z.number() }).optional(),
});

export class LinkedInApiMetricsProvider implements MetricsProvider {
  readonly source = 'linkedin' as const;

  async fetchPostMetrics(input: {
    userId: string;
    postId: string;
    postUrn: string;
    publishedAt: string | null;
  }): Promise<RawPostMetrics> {
    const base: RawPostMetrics = {
      impressions: 0,
      membersReached: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      source: 'linkedin',
    };

    // ── 1차: 상세 애널리틱스 ─────────────────────────────
    try {
      const path =
        `/rest/memberCreatorPostAnalytics?q=entity` +
        `&entity=${encodeURIComponent(input.postUrn)}` +
        `&metricTypes=List(IMPRESSION,MEMBERS_REACHED,REACTION,COMMENT,RESHARE,LINK_CLICKS)`;

      const res = await linkedinFetch<unknown>({
        userId: input.userId,
        method: 'GET',
        path,
        maxRetries: 0, // 권한 문제라면 재시도해도 소용없다
      });

      const parsed = analyticsSchema.safeParse(res.data);
      if (parsed.success && parsed.data.elements?.length) {
        for (const el of parsed.data.elements) {
          const value = el.metricValue ?? 0;
          switch (el.metricType) {
            case 'IMPRESSION':
              base.impressions = value;
              break;
            case 'MEMBERS_REACHED':
              base.membersReached = value;
              break;
            case 'REACTION':
              base.reactions = value;
              break;
            case 'COMMENT':
              base.comments = value;
              break;
            case 'RESHARE':
              base.shares = value;
              break;
            case 'LINK_CLICKS':
              base.clicks = value;
              break;
          }
        }
        return base;
      }
    } catch (e) {
      // 권한 미승인(403) 등 — 로그는 client.ts 가 이미 DB 에 남겼다
      console.warn('[metrics] memberCreatorPostAnalytics 사용 불가, socialMetadata 로 폴백합니다.', e);
    }

    // ── 2차 폴백: 반응/댓글 수만 ─────────────────────────
    const res = await linkedinFetch<unknown>({
      userId: input.userId,
      method: 'GET',
      path: `/rest/socialMetadata/${encodeURIComponent(input.postUrn)}`,
      maxRetries: 0,
    });

    const parsed = socialMetadataSchema.safeParse(res.data);
    if (parsed.success) {
      const reactions = Object.values(parsed.data.reactionSummaries ?? {}).reduce(
        (sum, r) => sum + r.count,
        0,
      );
      base.reactions = reactions;
      base.comments = parsed.data.commentSummary?.count ?? 0;
    }
    return base;
  }
}
