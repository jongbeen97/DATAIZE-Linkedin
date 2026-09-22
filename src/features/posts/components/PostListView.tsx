'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { useToast } from '@/shared/ui/toast';
import { hintFor } from '@/shared/lib/http';
import { truncate } from '@/shared/lib/format';
import type { PostStatus } from '@/entities/post';
import * as api from '../api/postsApi';
import type { PostListResponse } from '../api/postsApi';
import { PostFilterBar } from './list/PostFilterBar';
import { PostTable } from './list/PostTable';
import { PostActionModal } from './list/PostActionModal';
import { Pagination } from './list/Pagination';
import type { PostAction } from './list/types';

const PAGE_SIZE = 10;

/**
 * 게시물 목록 화면 — 조회 상태와 동작 흐름만 담당합니다.
 * 표현은 list/ 아래 컴포넌트(필터바 · 표 · 모달 · 페이지네이션)가 갖고 있습니다.
 *
 * 운영 담당자의 업무 흐름을 기준으로 설계했습니다.
 *  - 필터/검색 조건이 URL 에 남는다 → 대시보드에서 "실패 2건"을 클릭하면
 *    이미 FAILED 로 필터된 목록이 열리고, 그 URL 을 그대로 동료에게 공유할 수 있다
 *  - 실패한 게시물은 사유와 [재시도] 버튼이 같은 줄에 보인다
 *  - 되돌릴 수 없는 동작은 전부 확인 모달을 거친다
 */
export function PostListView() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const statusParam = params.get('status') as PostStatus | null;
  const keywordParam = params.get('keyword') ?? '';
  const pageParam = Number(params.get('page') ?? '1');

  const [data, setData] = useState<PostListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PostAction | null>(null);

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

  /** 필터 상태의 단일 소스는 URL 입니다 */
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

  /** 확인 모달을 통과한 동작을 실제로 실행합니다 */
  async function runAction({ post, kind }: PostAction) {
    setPendingAction(null);
    setBusyId(post.id);

    if (kind === 'publish') {
      const res = await api.publishPost(post.id);
      setBusyId(null);
      if (!res.ok) {
        toast.error(`${res.error.message} ${hintFor(res.error)}`);
      } else {
        toast.success(
          `'${truncate(post.title, 20)}' 게시물이 LinkedIn 에 발행되었습니다.`,
          res.data.linkedinUrl
            ? { url: res.data.linkedinUrl, label: 'LinkedIn 에서 보기' }
            : undefined,
        );
      }
    } else if (kind === 'unpublish') {
      const res = await api.unpublishPost(post.id);
      setBusyId(null);
      if (!res.ok) {
        toast.error(`${res.error.message} ${hintFor(res.error)}`);
      } else if (res.data.alreadyGone) {
        // 이미 지워진 글이어도 목적은 달성된 상태이므로 실패로 다루지 않습니다
        toast.success('이미 LinkedIn 에서 삭제된 게시물이었습니다. 상태를 정정했습니다.');
      } else {
        toast.success('LinkedIn 에서 게시물을 삭제했습니다. 성과 기록은 그대로 보존됩니다.');
      }
    } else {
      const res = await api.deletePost(post.id);
      setBusyId(null);
      if (!res.ok) toast.error(`${res.error.message} ${hintFor(res.error)}`);
      else toast.success('게시물을 삭제했습니다.');
    }

    void load();
  }

  const isFiltered = Boolean(statusParam || keywordParam);

  return (
    <div className="space-y-4">
      <PostFilterBar
        status={statusParam}
        keyword={keywordParam}
        onChange={(next) => applyFilter(next)}
      />

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
            title={isFiltered ? '조건에 맞는 게시물이 없습니다' : '아직 게시물이 없습니다'}
            description={
              isFiltered
                ? '필터를 해제하거나 다른 검색어로 다시 찾아보세요.'
                : '첫 게시물을 작성하면 LinkedIn 에 바로 발행하고 성과를 추적할 수 있습니다.'
            }
            action={
              isFiltered ? (
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
            <PostTable posts={data.items} busyId={busyId} onAction={setPendingAction} />
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onChange={(page) => applyFilter({ page })}
            />
          </>
        )}
      </Card>

      <PostActionModal
        action={pendingAction}
        onCancel={() => setPendingAction(null)}
        onConfirm={(action) => void runAction(action)}
      />
    </div>
  );
}
