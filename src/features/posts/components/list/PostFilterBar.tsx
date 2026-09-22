'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@/shared/ui';
import { cx } from '@/shared/lib/format';
import { POST_STATUSES, POST_STATUS_LABEL, type PostStatus } from '@/entities/post';

/**
 * 상태 필터 + 키워드 검색.
 *
 * 필터 상태는 컴포넌트가 아니라 **URL 이 단일 소스**입니다.
 * 덕분에 `/posts?status=FAILED` 를 그대로 공유·북마크할 수 있고,
 * 대시보드의 "실패 2건" 클릭이 곧바로 이 화면의 필터가 됩니다.
 */
export function PostFilterBar({
  status,
  keyword,
  onChange,
}: {
  status: PostStatus | null;
  keyword: string;
  onChange: (next: { status?: PostStatus | null; keyword?: string }) => void;
}) {
  const [draft, setDraft] = useState(keyword);

  // 뒤로가기 등으로 URL 이 바뀌면 입력창도 따라갑니다
  useEffect(() => setDraft(keyword), [keyword]);

  return (
    <Card className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={!status} onClick={() => onChange({ status: null })}>
          전체
        </FilterChip>
        {POST_STATUSES.map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => onChange({ status: s })}>
            {POST_STATUS_LABEL[s]}
          </FilterChip>
        ))}
      </div>

      <form
        className="ml-auto flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange({ keyword: draft });
        }}
      >
        <label htmlFor="post-search" className="sr-only">
          게시물 검색
        </label>
        <input
          id="post-search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="제목·본문 검색"
          className="h-9 w-52 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
        />
        <Button size="sm" type="submit">
          검색
        </Button>
        {keyword && (
          <Button size="sm" variant="ghost" onClick={() => onChange({ keyword: '' })}>
            초기화
          </Button>
        )}
      </form>
    </Card>
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
