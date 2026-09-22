import type { PostStatus, MetricsSource } from '@/entities/post';
import type { Lead, LeadSource, LeadStatus } from '@/entities/lead';
import * as postRepo from '@/server/repositories/postRepository';
import * as leadRepo from '@/server/repositories/leadRepository';
import { findLatestMetricsForPosts, findLastCollectedAt } from '@/server/repositories/metricsRepository';
import { env } from '@/shared/config/env';

/** 대시보드 한 화면에 필요한 모든 데이터를 한 번의 요청으로 내려준다 */
export interface DashboardSummary {
  statusCounts: Record<PostStatus, number>;
  totalPosts: number;
  /** 운영자가 오늘 바로 조치해야 하는 항목 */
  actionRequired: {
    failed: number;
    scheduled: number;
  };
  totals: {
    impressions: number;
    reactions: number;
    comments: number;
    shares: number;
    clicks: number;
    engagementRate: number;
  };
  metricsSource: MetricsSource;
  metricsCollectedAt: string | null;
  dailyPublished: Array<{ date: string; count: number }>;
  dailyLeads: Array<{ date: string; count: number }>;
  leadStatusCounts: Record<LeadStatus, number>;
  leadSourceCounts: Array<{ source: LeadSource; count: number }>;
  recentLeads: Lead[];
  recentPosts: Array<{
    id: string;
    title: string;
    status: PostStatus;
    publishedAt: string | null;
    linkedinUrl: string | null;
    impressions: number | null;
    reactions: number | null;
  }>;
}

export async function buildDashboardSummary(userId: string): Promise<DashboardSummary> {
  // 서로 의존하지 않는 조회는 병렬로 — 대시보드 응답 시간을 줄인다
  const [statusCounts, dailyPublished, dailyLeads, leadStatusCounts, leadSourceCounts, recentLeads, recent] =
    await Promise.all([
      postRepo.countByStatus(userId),
      postRepo.dailyPublishedCounts(userId, 14),
      leadRepo.dailyLeadCounts(14),
      leadRepo.countLeadsByStatus(),
      leadRepo.countLeadsBySource(),
      leadRepo.listRecentLeads(8),
      postRepo.listPosts({ userId, page: 1, pageSize: 5 }),
    ]);

  const publishedIds = await postRepo.findPublishedPostIds(userId, 50);
  const [metricsMap, collectedAt] = await Promise.all([
    findLatestMetricsForPosts(publishedIds),
    findLastCollectedAt(publishedIds),
  ]);

  const totals = { impressions: 0, reactions: 0, comments: 0, shares: 0, clicks: 0 };
  for (const m of metricsMap.values()) {
    totals.impressions += m.impressions;
    totals.reactions += m.reactions;
    totals.comments += m.comments;
    totals.shares += m.shares;
    totals.clicks += m.clicks;
  }

  const engagementRate =
    totals.impressions > 0
      ? ((totals.reactions + totals.comments + totals.shares) / totals.impressions) * 100
      : 0;

  return {
    statusCounts,
    totalPosts: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    actionRequired: {
      failed: statusCounts.FAILED,
      scheduled: statusCounts.SCHEDULED,
    },
    totals: { ...totals, engagementRate },
    metricsSource: env().METRICS_PROVIDER,
    metricsCollectedAt: collectedAt,
    dailyPublished,
    dailyLeads,
    leadStatusCounts,
    leadSourceCounts,
    recentLeads,
    recentPosts: recent.items.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      publishedAt: p.publishedAt,
      linkedinUrl: p.linkedinUrl,
      impressions: p.metrics?.impressions ?? null,
      reactions: p.metrics?.reactions ?? null,
    })),
  };
}
