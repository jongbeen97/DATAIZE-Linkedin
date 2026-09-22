'use client';

import Link from 'next/link';
import { Button, Delta } from '@/shared/ui';
import { formatDateTime, formatNumber, truncate } from '@/shared/lib/format';
import { isDeletable, isLiveOnLinkedIn, type PostWithMetrics } from '@/entities/post';
import { StatusBadge } from '../StatusBadge';
import type { PostAction } from './types';

/**
 * 게시물 목록 표.
 *
 * 실패 사유를 목록에서 바로 보여주는 것이 핵심입니다.
 * 상세로 들어가지 않아도 원인을 알 수 있어야 같은 줄의 [재시도]로 바로 이어집니다.
 */
export function PostTable({
  posts,
  busyId,
  onAction,
}: {
  posts: PostWithMetrics[];
  busyId: string | null;
  onAction: (action: PostAction) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[54rem] text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--ink-muted)]">
            <th className="px-5 py-3 font-medium">제목</th>
            <th className="px-3 py-3 font-medium">상태</th>
            <th className="px-3 py-3 font-medium">발행 시각</th>
            <th className="px-3 py-3 text-right font-medium">노출</th>
            <th className="px-3 py-3 text-right font-medium">반응</th>
            <th className="px-5 py-3 text-right font-medium">작업</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr
              key={post.id}
              className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--canvas)]"
            >
              <td className="max-w-xs px-5 py-3">
                <Link href={`/posts/${post.id}`} className="font-medium hover:underline">
                  {post.title}
                </Link>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  {truncate(post.content.replace(/\n/g, ' '), 52)}
                </p>
                {/* 실패 사유를 목록에서 바로 보여준다 → 상세로 들어가지 않아도 원인 파악 */}
                {post.status === 'FAILED' && post.failReason && (
                  <p className="mt-1 text-[11px] leading-relaxed text-rose-600">
                    실패 사유: {truncate(post.failReason, 80)}
                  </p>
                )}
              </td>

              <td className="px-3 py-3">
                <StatusBadge status={post.status} />
              </td>

              <td className="px-3 py-3 text-xs whitespace-nowrap text-[var(--ink-muted)]">
                {post.publishedAt ? formatDateTime(post.publishedAt) : '-'}
              </td>

              <td className="px-3 py-3 text-right text-xs tabular-nums">
                {post.metrics ? (
                  <span className="inline-flex items-baseline gap-1.5">
                    {formatNumber(post.metrics.impressions)}
                    {post.impressionsDelta !== null && (
                      <Delta value={post.impressionsDelta} className="text-[10px] font-medium" />
                    )}
                  </span>
                ) : (
                  '-'
                )}
              </td>

              <td className="px-3 py-3 text-right text-xs tabular-nums">
                {post.metrics ? formatNumber(post.metrics.reactions) : '-'}
              </td>

              <td className="px-5 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  {post.linkedinUrl && isLiveOnLinkedIn(post.status) && (
                    <a href={post.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">
                        LinkedIn ↗
                      </Button>
                    </a>
                  )}

                  {post.status === 'PUBLISHED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busyId === post.id}
                      onClick={() => onAction({ post, kind: 'unpublish' })}
                    >
                      LinkedIn에서 삭제
                    </Button>
                  )}

                  {post.status === 'REMOVED' && (
                    <span className="text-xs text-[var(--ink-muted)]">LinkedIn 에서 삭제됨</span>
                  )}

                  {(post.status === 'DRAFT' ||
                    post.status === 'SCHEDULED' ||
                    post.status === 'FAILED') && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={busyId === post.id}
                      onClick={() => onAction({ post, kind: 'publish' })}
                    >
                      {post.status === 'FAILED' ? '재시도' : '게시'}
                    </Button>
                  )}

                  {/* 삭제 가능 여부는 도메인 규칙 한 곳에서만 판단합니다 (entities/post) */}
                  {isDeletable(post.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAction({ post, kind: 'delete' })}
                    >
                      삭제
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
