'use client';

import Link from 'next/link';
import {
  Button,
  Delta,
  IconExternal,
  IconFile,
  IconMore,
  IconTrash,
  Menu,
  type MenuItem,
} from '@/shared/ui';
import { formatDate, formatNumber, truncate } from '@/shared/lib/format';
import {
  POST_STATUS_COLOR,
  isDeletable,
  isLiveOnLinkedIn,
  type PostWithMetrics,
} from '@/entities/post';
import { StatusBadge } from '../StatusBadge';
import type { PostAction } from './types';

/**
 * 게시물 목록 표.
 *
 * 한 줄의 오른쪽 끝에는 **그 글에서 지금 가장 할 법한 동작 하나**만 버튼으로 두고
 * (실패 → 재시도, 초안 · 예약 → 게시, 발행 완료 → LinkedIn 에서 보기),
 * 나머지(상세 · LinkedIn 삭제 · 삭제)는 [⋯] 메뉴로 접었습니다.
 * 버튼이 줄마다 다르게 늘어서지 않아 표가 정돈되고, 되돌릴 수 없는 동작은 한 단계 뒤에 있게 됩니다.
 *
 * 실패 사유는 여전히 목록에서 바로 보입니다 — 원인을 본 자리에서 곧장 [재시도]로 이어지도록.
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
      <table className="w-full min-w-[60rem] text-sm">
        <thead>
          <tr className="bg-[var(--table-head)] text-left text-[13px] text-[var(--ink)]">
            <th className="w-[34%] px-5 py-3 font-semibold">게시물</th>
            <th className="px-3 py-3 font-semibold">상태</th>
            <th className="px-3 py-3 font-semibold">발행일</th>
            <th className="px-3 py-3 font-semibold">노출</th>
            <th className="px-3 py-3 font-semibold">반응</th>
            <th className="px-5 py-3 font-semibold">작업</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr
              key={post.id}
              className="border-t border-[var(--line)] transition-colors hover:bg-[var(--surface-sunken)]"
            >
              <td className="max-w-0 px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <PostThumb post={post} />
                  <div className="min-w-0">
                    <Link
                      href={`/posts/${post.id}`}
                      className="block truncate font-semibold hover:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">
                      {post.content.replace(/\n/g, ' ')}
                    </p>
                    {/* 실패 사유를 목록에서 바로 보여준다 → 상세로 들어가지 않아도 원인 파악 */}
                    {post.status === 'FAILED' && post.failReason && (
                      <p
                        title={post.failReason}
                        className="mt-0.5 truncate text-xs text-rose-600 dark:text-rose-400"
                      >
                        실패 사유: {post.failReason}
                      </p>
                    )}
                  </div>
                </div>
              </td>

              <td className="px-3 py-2.5">
                <StatusBadge status={post.status} />
              </td>

              <td className="px-3 py-2.5 whitespace-nowrap">
                <PublishedCell post={post} />
              </td>

              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                {post.metrics ? (
                  <>
                    <p className="font-semibold">{formatNumber(post.metrics.impressions)}</p>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      {post.impressionsDelta === null ? (
                        '첫 수집'
                      ) : post.impressionsDelta === 0 ? (
                        '변동 없음'
                      ) : (
                        <Delta value={post.impressionsDelta} className="font-medium" />
                      )}
                    </p>
                  </>
                ) : (
                  <span className="text-[var(--ink-subtle)]">-</span>
                )}
              </td>

              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                {post.metrics ? (
                  <>
                    <p className="font-semibold">{formatNumber(post.metrics.reactions)}</p>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      댓글 {formatNumber(post.metrics.comments)} · 공유{' '}
                      {formatNumber(post.metrics.shares)}
                    </p>
                  </>
                ) : (
                  <span className="text-[var(--ink-subtle)]">-</span>
                )}
              </td>

              <td className="px-5 py-2.5">
                <div className="flex items-center gap-1.5">
                  <PrimaryAction post={post} busy={busyId === post.id} onAction={onAction} />
                  <Menu
                    label={`'${truncate(post.title, 20)}' 작업 더 보기`}
                    trigger={<IconMore size={18} />}
                    items={menuItems(post, onAction)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 상태 색을 입힌 작은 썸네일 — 목록을 훑을 때 색만으로도 상태 분포가 읽힙니다 */
function PostThumb({ post }: { post: PostWithMetrics }) {
  const color = POST_STATUS_COLOR[post.status];
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-lg"
      style={{
        color: `color-mix(in srgb, ${color} 75%, var(--ink))`,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <IconFile size={16} />
    </span>
  );
}

function PublishedCell({ post }: { post: PostWithMetrics }) {
  if (post.publishedAt) {
    const d = new Date(post.publishedAt);
    return (
      <>
        <p className="font-medium tabular-nums">{formatDate(post.publishedAt)}</p>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)] tabular-nums">
          {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}{' '}
          · {post.visibility === 'PUBLIC' ? '전체 공개' : '1촌 공개'}
        </p>
      </>
    );
  }
  if (post.status === 'SCHEDULED' && post.scheduledAt) {
    return (
      <>
        <p className="font-medium tabular-nums">{formatDate(post.scheduledAt)}</p>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">예약됨</p>
      </>
    );
  }
  return <p className="text-[var(--ink-subtle)]">미발행</p>;
}

function PrimaryAction({
  post,
  busy,
  onAction,
}: {
  post: PostWithMetrics;
  busy: boolean;
  onAction: (action: PostAction) => void;
}) {
  const cls = 'w-[5.5rem]';

  if (busy) {
    return <Button size="sm" loading className={cls}>처리 중</Button>;
  }

  if (post.status === 'DRAFT' || post.status === 'SCHEDULED' || post.status === 'FAILED') {
    return (
      <Button
        size="sm"
        variant={post.status === 'FAILED' ? 'primary' : 'secondary'}
        className={cls}
        onClick={() => onAction({ post, kind: 'publish' })}
      >
        {post.status === 'FAILED' ? '재시도' : '게시'}
      </Button>
    );
  }

  if (post.linkedinUrl && isLiveOnLinkedIn(post.status)) {
    return (
      <a href={post.linkedinUrl} target="_blank" rel="noopener noreferrer">
        <Button size="sm" className={cls}>
          LinkedIn <IconExternal size={13} />
        </Button>
      </a>
    );
  }

  return (
    <Link href={`/posts/${post.id}`}>
      <Button size="sm" className={cls}>
        상세
      </Button>
    </Link>
  );
}

function menuItems(post: PostWithMetrics, onAction: (a: PostAction) => void): MenuItem[] {
  const items: MenuItem[] = [
    { key: 'detail', label: '상세 보기', icon: <IconFile />, href: `/posts/${post.id}` },
  ];

  if (post.linkedinUrl && isLiveOnLinkedIn(post.status)) {
    items.push({
      key: 'open',
      label: 'LinkedIn 에서 보기',
      icon: <IconExternal />,
      externalHref: post.linkedinUrl,
    });
  }

  if (post.status === 'PUBLISHED') {
    items.push({
      key: 'unpublish',
      label: 'LinkedIn 에서 삭제',
      icon: <IconTrash />,
      danger: true,
      onSelect: () => onAction({ post, kind: 'unpublish' }),
    });
  }

  // 삭제 가능 여부는 도메인 규칙 한 곳에서만 판단합니다 (entities/post)
  if (isDeletable(post.status)) {
    items.push({
      key: 'delete',
      label: '기록 삭제',
      icon: <IconTrash />,
      danger: true,
      onSelect: () => onAction({ post, kind: 'delete' }),
    });
  }

  return items;
}
