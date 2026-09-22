'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Badge, EmptyState, ErrorState, Skeleton, Modal } from '@/shared/ui/primitives';
import { useToast } from '@/shared/ui/toast';
import { hintFor } from '@/shared/lib/http';
import { formatDateTime, formatNumber, truncate, cx } from '@/shared/lib/format';
import {
  POST_STATUSES,
  POST_STATUS_LABEL,
  isDeletable,
  isLiveOnLinkedIn,
  type PostStatus,
  type PostWithMetrics,
} from '@/entities/post';
import { StatusBadge } from './StatusBadge';
import { Delta } from '@/shared/ui/Sparkline';
import * as api from '../api/postsApi';
import type { PostListResponse } from '../api/postsApi';

const PAGE_SIZE = 10;

/**
 * 게시물 목록 화면.
 *
 * 운영 담당자의 실제 업무 흐름을 기준으로 설계했습니다.
 *  - 필터/검색 조건이 URL 에 남는다 → 대시보드에서 "실패 2건"을 클릭하면
 *    이미 FAILED 로 필터된 목록이 열리고, 그 URL 을 그대로 동료에게 공유할 수 있다
 *  - 실패한 게시물은 사유와 [재시도] 버튼이 같은 줄에 보인다
 *  - 발행 완료 게시물은 실제 LinkedIn 링크로 바로 이동할 수 있다
 */
export function PostListView() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const statusParam = params.get('status') as PostStatus | null;
  const keywordParam = params.get('keyword') ?? '';
  const pageParam = Number(params.get('page') ?? '1');

  const [keyword, setKeyword] = useState(keywordParam);
  const [data, setData] = useState<PostListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    post: PostWithMetrics;
    kind: 'publish' | 'delete' | 'remove';
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.fetchPosts({
      status: statusParam ?? undefined,
      keyword: keywordParam || undefined,
      page: pageParam,
      pageSize: PAGE_SIZE,
    });
    setLoading(false);
    if (!res.ok) {
      setError({ message: res.error.message, hint: hintFor(res.error) });
      return;
    }
    setData(res.data);
  }, [statusParam, keywordParam, pageParam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setKeyword(keywordParam), [keywordParam]);

  function applyFilter(next: { status?: PostStatus | null; keyword?: string; page?: number }) {
    const q = new URLSearchParams(params.toString());
    if ('status' in next) {
      if (next.status) q.set('status', next.status);
      else q.delete('status');
    }
    if ('keyword' in next) {
      if (next.keyword) q.set('keyword', next.keyword);
      else q.delete('keyword');
    }
    q.set('page', String(next.page ?? 1));
    router.push(`/posts?${q.toString()}`);
  }

  async function runPublish(post: PostWithMetrics) {
    setConfirm(null);
    setBusyId(post.id);
    const res = await api.publishPost(post.id);
    setBusyId(null);

    if (!res.ok) {
      toast.error(`${res.error.message} ${hintFor(res.error)}`);
    } else {
      toast.success(
        `'${truncate(post.title, 20)}' 게시물이 LinkedIn 에 발행되었습니다.`,
        res.data.linkedinUrl ? { url: res.data.linkedinUrl, label: 'LinkedIn 에서 보기' } : undefined,
      );
    }
    void load();
  }

  /** LinkedIn 의 실제 게시물을 삭제 (우리 기록은 REMOVED 로 보존) */
  async function runUnpublish(post: PostWithMetrics) {
    setConfirm(null);
    setBusyId(post.id);
    const res = await api.unpublishPost(post.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(`${res.error.message} ${hintFor(res.error)}`);
    } else if (res.data.alreadyGone) {
      toast.success('이미 LinkedIn 에서 삭제된 게시물이었습니다. 상태를 정정했습니다.');
    } else {
      toast.success('LinkedIn 에서 게시물을 삭제했습니다. 성과 기록은 그대로 보존됩니다.');
    }
    void load();
  }

  async function runDelete(post: PostWithMetrics) {
    setConfirm(null);
    setBusyId(post.id);
    const res = await api.deletePost(post.id);
    setBusyId(null);
    if (!res.ok) toast.error(`${res.error.message} ${hintFor(res.error)}`);
    else toast.success('게시물을 삭제했습니다.');
    void load();
  }

  return (
    <div className="space-y-4">
      {/* ------------------------- 필터 바 ------------------------- */}
      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={!statusParam} onClick={() => applyFilter({ status: null })}>
            전체
          </FilterChip>
          {POST_STATUSES.map((s) => (
            <FilterChip key={s} active={statusParam === s} onClick={() => applyFilter({ status: s })}>
              {POST_STATUS_LABEL[s]}
            </FilterChip>
          ))}
        </div>

        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilter({ keyword });
          }}
        >
          <label htmlFor="post-search" className="sr-only">
            게시물 검색
          </label>
          <input
            id="post-search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="제목·본문 검색"
            className="h-9 w-52 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
          />
          <Button size="sm" type="submit">
            검색
          </Button>
          {keywordParam && (
            <Button size="sm" variant="ghost" onClick={() => applyFilter({ keyword: '' })}>
              초기화
            </Button>
          )}
        </form>
      </Card>

      {/* ------------------------- 목록 ------------------------- */}
      <Card padded={false}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} hint={error.hint} onRetry={() => void load()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title={statusParam || keywordParam ? '조건에 맞는 게시물이 없습니다' : '아직 게시물이 없습니다'}
            description={
              statusParam || keywordParam
                ? '필터를 해제하거나 다른 검색어로 다시 찾아보세요.'
                : '첫 게시물을 작성하면 LinkedIn 에 바로 발행하고 성과를 추적할 수 있습니다.'
            }
            action={
              statusParam || keywordParam ? (
                <Button size="sm" onClick={() => applyFilter({ status: null, keyword: '' })}>
                  필터 초기화
                </Button>
              ) : (
                <Link href="/posts/new">
                  <Button size="sm" variant="primary">
                    첫 게시물 작성하기
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <>
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
                  {data.items.map((post) => (
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
                              <Delta
                                value={post.impressionsDelta}
                                className="text-[10px] font-medium"
                              />
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
                              onClick={() => setConfirm({ post, kind: 'remove' })}
                            >
                              LinkedIn에서 삭제
                            </Button>
                          )}
                          {post.status === 'REMOVED' && (
                            <span className="text-xs text-[var(--ink-muted)]">
                              LinkedIn 에서 삭제됨
                            </span>
                          )}
                          {(post.status === 'DRAFT' ||
                            post.status === 'SCHEDULED' ||
                            post.status === 'FAILED') && (
                            <Button
                              size="sm"
                              variant="primary"
                              loading={busyId === post.id}
                              onClick={() => setConfirm({ post, kind: 'publish' })}
                            >
                              {post.status === 'FAILED' ? '재시도' : '게시'}
                            </Button>
                          )}
                          {isDeletable(post.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirm({ post, kind: 'delete' })}
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

            {/* ------------------------- 페이지네이션 ------------------------- */}
            <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--ink-muted)]">
              <span>
                전체 {formatNumber(data.total)}건 중 {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => applyFilter({ page: data.page - 1 })}
                >
                  이전
                </Button>
                <span className="tabular-nums">
                  {data.page} / {data.totalPages}
                </span>
                <Button
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => applyFilter({ page: data.page + 1 })}
                >
                  다음
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ------------------------- 확인 모달 ------------------------- */}
      <Modal
        open={confirm !== null}
        title={
          confirm?.kind === 'delete'
            ? '게시물을 삭제할까요?'
            : confirm?.kind === 'remove'
              ? '실제 LinkedIn 게시물을 삭제합니다'
              : '실제 LinkedIn 에 게시됩니다'
        }
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              취소
            </Button>
            <Button
              variant={
                confirm?.kind === 'delete' || confirm?.kind === 'remove' ? 'danger' : 'primary'
              }
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === 'delete') void runDelete(confirm.post);
                else if (confirm.kind === 'remove') void runUnpublish(confirm.post);
                else void runPublish(confirm.post);
              }}
            >
              {confirm?.kind === 'delete'
                ? '삭제'
                : confirm?.kind === 'remove'
                  ? '네, LinkedIn 에서 삭제합니다'
                  : '네, 지금 게시합니다'}
            </Button>
          </>
        }
      >
        {confirm?.kind === 'delete' ? (
          <p>
            &lsquo;{confirm.post.title}&rsquo; 게시물을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
        ) : confirm?.kind === 'remove' ? (
          <div className="space-y-2 leading-relaxed">
            <p>
              &lsquo;{confirm.post.title}&rsquo; 을(를){' '}
              <strong className="text-[var(--ink)]">LinkedIn 에서 실제로 삭제합니다.</strong> 이
              작업은 되돌릴 수 없습니다.
            </p>
            <p className="text-[var(--ink-muted)]">
              관리자 페이지의 기록은 <strong>LinkedIn 삭제됨</strong> 상태로 남습니다. 노출·반응 등
              성과 지표와 이 글을 통해 들어온 리드 정보는 그대로 보존됩니다.
            </p>
            <p className="text-[var(--ink-muted)]">
              이미 LinkedIn 에서 지우신 글이라면, 상태만 정정됩니다.
            </p>
          </div>
        ) : (
          <>
            <p className="leading-relaxed">
              이 작업은 <strong className="text-[var(--ink)]">되돌릴 수 없습니다.</strong> 게시 후에는
              LinkedIn 에서 직접 수정·삭제해야 합니다.
            </p>
            {confirm && (
              <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {confirm.post.content}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'h-8 rounded-full border px-3 text-xs font-medium transition',
        active
          ? 'border-transparent bg-[var(--color-brand-600)] text-white'
          : 'border-[var(--line)] text-[var(--ink-muted)] hover:bg-[var(--canvas)]',
      )}
    >
      {children}
    </button>
  );
}
