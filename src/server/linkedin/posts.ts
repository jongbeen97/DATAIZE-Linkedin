import { AppError } from '@/shared/lib/api-response';
import type { PostVisibility } from '@/entities/post';
import { linkedinFetch } from './client';

/**
 * LinkedIn Posts API — 개인 계정(member) 게시
 *
 *   POST https://api.linkedin.com/rest/posts
 *   헤더: LinkedIn-Version: YYYYMM, X-Restli-Protocol-Version: 2.0.0
 *   권한: w_member_social
 *   응답: 201 Created, 게시물 URN 은 응답 헤더 x-restli-id 에 담겨 온다
 *
 * 참고: https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api
 */

export interface PublishResult {
  urn: string; // urn:li:share:7123... 또는 urn:li:ugcPost:...
  url: string; // 사람이 열어볼 수 있는 실제 게시물 링크
}

export async function publishMemberPost(input: {
  userId: string;
  personUrn: string;
  content: string;
  visibility: PostVisibility;
}): Promise<PublishResult> {
  const body = {
    author: input.personUrn,
    commentary: input.content,
    visibility: input.visibility,
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const res = await linkedinFetch<{ id?: string }>({
    userId: input.userId,
    method: 'POST',
    path: '/rest/posts',
    body,
    useVersionHeader: true,
  });

  // 성공(201)인데 URN 이 없으면 우리 DB 와 LinkedIn 상태가 어긋난다 → 명시적으로 실패 처리
  const urn = res.restliId ?? res.data.id ?? null;
  if (!urn) {
    throw new AppError(
      'LINKEDIN_UNAVAILABLE',
      'LinkedIn 이 게시물 식별자(URN)를 반환하지 않았습니다. LinkedIn 피드에서 중복 게시 여부를 직접 확인해 주세요.',
    );
  }

  return { urn, url: buildPostUrl(urn) };
}

export function buildPostUrl(urn: string): string {
  return `https://www.linkedin.com/feed/update/${urn}`;
}
