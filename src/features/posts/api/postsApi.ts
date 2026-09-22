'use client';

import { apiCall } from '@/shared/lib/http';
import type { ApiResult } from '@/shared/api/contract';
import type { Post, PostWithMetrics, PostMetricsSnapshot } from '@/entities/post';
import type { CreatePostInput, ListPostsQuery } from '../model/schema';

export interface PostListResponse {
  items: PostWithMetrics[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** features/posts 가 우리 서버와 대화하는 유일한 창구 */
export function fetchPosts(query: Partial<ListPostsQuery>): Promise<ApiResult<PostListResponse>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return apiCall<PostListResponse>(`/api/posts?${params.toString()}`);
}

export function fetchPost(id: string): Promise<ApiResult<Post & { metrics: PostMetricsSnapshot | null }>> {
  return apiCall(`/api/posts/${id}`);
}

export function createPost(input: CreatePostInput): Promise<ApiResult<Post>> {
  return apiCall<Post>('/api/posts', { method: 'POST', json: input });
}

export function updatePost(id: string, input: CreatePostInput): Promise<ApiResult<Post>> {
  return apiCall<Post>(`/api/posts/${id}`, { method: 'PATCH', json: input });
}

export function deletePost(id: string): Promise<ApiResult<{ id: string }>> {
  return apiCall(`/api/posts/${id}`, { method: 'DELETE' });
}

export function publishPost(id: string): Promise<ApiResult<Post>> {
  return apiCall<Post>(`/api/posts/${id}/publish`, { method: 'POST' });
}

/** LinkedIn 의 실제 게시물을 삭제하고 기록은 REMOVED 로 남김 */
export function unpublishPost(
  id: string,
): Promise<ApiResult<{ post: Post; alreadyGone: boolean }>> {
  return apiCall(`/api/posts/${id}/unpublish`, { method: 'POST' });
}

export function refreshMetrics(): Promise<
  ApiResult<{ updated: number; failed: number; removed: number }>
> {
  return apiCall('/api/metrics/refresh', { method: 'POST' });
}
