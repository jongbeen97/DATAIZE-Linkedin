'use client';

import { useEffect, useState } from 'react';
import { Button, IconCalendar, IconChevronDown, IconSearch } from '@/shared/ui';
import { POST_STATUSES, POST_STATUS_LABEL, type PostStatus } from '@/entities/post';

/** 브라우저 기본 달력 아이콘은 숨기고(왼쪽에 아이콘 하나만), 칸 전체를 눌러 달력을 엽니다 */
const DATE_INPUT =
  'w-[6.6rem] cursor-pointer bg-transparent text-sm font-medium outline-none [&::-webkit-calendar-picker-indicator]:hidden';

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    /* 지원하지 않는 브라우저는 기본 입력 방식 그대로 */
  }
}

export interface PostFilter {
  status: PostStatus | null;
  keyword: string;
  from: string;
  to: string;
}

/**
 * 표 머리의 조회 도구 — 검색 · 상태 · 작성일 기간.
 *
 * 필터 상태는 컴포넌트가 아니라 **URL 이 단일 소스**입니다.
 * 덕분에 `/posts?status=FAILED` 를 그대로 공유·북마크할 수 있고,
 * 대시보드의 "실패 2건" 클릭이 곧바로 이 화면의 필터가 됩니다.
 *
 * 상태가 6가지라 칩으로 늘어놓으면 한 줄을 다 차지합니다. 드롭다운 하나로 접고,
 * 자주 보는 상태는 상단 수치 띠를 눌러 바로 거를 수 있게 했습니다.
 */
export function PostFilterBar({
  filter,
  onChange,
}: {
  filter: PostFilter;
  onChange: (next: Partial<PostFilter>) => void;
}) {
  const [draft, setDraft] = useState(filter.keyword);

  // 뒤로가기 등으로 URL 이 바뀌면 입력창도 따라갑니다
  useEffect(() => setDraft(filter.keyword), [filter.keyword]);

  const isFiltered = Boolean(filter.status || filter.keyword || filter.from || filter.to);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
      <form
        role="search"
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 focus-within:border-[var(--color-brand-500)] sm:w-72"
        onSubmit={(e) => {
          e.preventDefault();
          onChange({ keyword: draft.trim() });
        }}
      >
        <IconSearch className="shrink-0 text-[var(--ink-muted)]" />
        <label htmlFor="post-search" className="sr-only">
          게시물 검색
        </label>
        <input
          id="post-search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="제목 · 본문으로 검색 후 Enter"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-subtle)]"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <div className="relative">
          <label htmlFor="post-status" className="sr-only">
            상태
          </label>
          <select
            id="post-status"
            value={filter.status ?? ''}
            onChange={(e) => onChange({ status: (e.target.value || null) as PostStatus | null })}
            className="h-9 appearance-none rounded-lg border border-[var(--line)] bg-[var(--surface)] pr-9 pl-3 text-sm font-medium outline-none focus:border-[var(--color-brand-500)]"
          >
            <option value="">전체 상태</option>
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {POST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--ink-muted)]" />
        </div>

        {/* 작성일 기간 — 브라우저 기본 달력을 그대로 써서 키보드 · 모바일 입력을 보장합니다 */}
        <div className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm focus-within:border-[var(--color-brand-500)]">
          <IconCalendar className="shrink-0 text-[var(--ink-muted)]" />
          <label htmlFor="post-from" className="sr-only">
            작성일 시작
          </label>
          <input
            id="post-from"
            type="date"
            value={filter.from}
            max={filter.to || undefined}
            onChange={(e) => onChange({ from: e.target.value })}
            onClick={openPicker}
            className={DATE_INPUT}
          />
          <span className="text-[var(--ink-subtle)]">~</span>
          <label htmlFor="post-to" className="sr-only">
            작성일 끝
          </label>
          <input
            id="post-to"
            type="date"
            value={filter.to}
            min={filter.from || undefined}
            onChange={(e) => onChange({ to: e.target.value })}
            onClick={openPicker}
            className={DATE_INPUT}
          />
        </div>

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => onChange({ status: null, keyword: '', from: '', to: '' })}
          >
            필터 초기화
          </Button>
        )}
      </div>
    </div>
  );
}
