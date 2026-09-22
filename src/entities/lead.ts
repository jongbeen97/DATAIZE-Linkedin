/**
 * Lead / 유입 도메인 모델
 *
 * 과제의 "최근 유입 및 회원/Lead 현황" 요구사항에 해당합니다.
 * LinkedIn 게시물 → 랜딩 유입 → 리드 전환 흐름을 추적합니다.
 */

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: '신규',
  CONTACTED: '접촉',
  QUALIFIED: '검증됨',
  CONVERTED: '전환',
  LOST: '이탈',
};

export const LEAD_SOURCES = ['linkedin', 'organic', 'referral', 'direct'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  linkedin: 'LinkedIn',
  organic: '검색',
  referral: '추천',
  direct: '직접 유입',
};

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  source: LeadSource;
  /** 어떤 게시물을 통해 들어왔는지 — 게시물 성과와 리드를 연결하는 핵심 필드 */
  referrerPostId: string | null;
  status: LeadStatus;
  createdAt: string;
}
