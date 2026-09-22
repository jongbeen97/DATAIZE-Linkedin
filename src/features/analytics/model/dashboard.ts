import type { PostStatus } from '@/entities/post';
import type { LeadSource, LeadStatus } from '@/entities/lead';

/**
 * 대시보드 한 화면이 필요로 하는 데이터 전부.
 *
 * 서버(`server/services/analyticsService.ts`)가 만드는 응답 형태와 1:1 로 대응합니다.
 * 화면 컴포넌트들이 이 타입 하나만 보고 동작하므로, 섹션을 쪼개도
 * 각 섹션이 필요한 조각만 props 로 받으면 됩니다.
 */
export interface DashboardSummary {
  statusCounts: Record<PostStatus, number>;
  totalPosts: number;
  /** 운영자가 오늘 바로 조치해야 하는 항목 */
  actionRequired: { failed: number; scheduled: number };
  totals: {
    impressions: number;
    reactions: number;
    comments: number;
    shares: number;
    clicks: number;
    engagementRate: number;
  };
  metricsSource: 'linkedin' | 'sample';
  metricsCollectedAt: string | null;
  dailyPublished: Array<{ date: string; count: number }>;
  dailyLeads: Array<{ date: string; count: number }>;
  leadStatusCounts: Record<LeadStatus, number>;
  leadSourceCounts: Array<{ source: LeadSource; count: number }>;
  recentLeads: DashboardLead[];
  recentPosts: DashboardRecentPost[];
  /** 게시물별 노출 → 리드 전환. 성과 지표와 유입 현황을 잇는 표 */
  postPerformance: DashboardPostPerformance[];
}

export interface DashboardLead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  createdAt: string;
}

export interface DashboardRecentPost {
  id: string;
  title: string;
  status: PostStatus;
  publishedAt: string | null;
  linkedinUrl: string | null;
  impressions: number | null;
  reactions: number | null;
}

export interface DashboardPostPerformance {
  id: string;
  title: string;
  impressions: number;
  reactions: number;
  leads: number;
  conversionRate: number;
}
