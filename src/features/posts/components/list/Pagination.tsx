'use client';

import { Button, IconArrowLeft, IconArrowRight } from '@/shared/ui';
import { cx, formatNumber } from '@/shared/lib/format';

/** 1 … 4 5 6 … 12 형태의 페이지 번호 목록. 처음 · 끝 · 현재 주변만 남깁니다 */
function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
  const keep = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...keep].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const out: Array<number | 'gap'> = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    if (prev !== undefined && p - prev > 1) {
      // 한 칸만 비면 번호를 그대로 보여주는 편이 '…'보다 짧습니다
      if (p - prev === 2) out.push(prev + 1);
      else out.push('gap');
    }
    out.push(p);
  });
  return out;
}

/**
 * 페이지네이션.
 *
 * 번호로 바로 이동할 수 있고, "전체 24건 중 1–10" 처럼 **지금 보고 있는 범위**를
 * 함께 표시합니다. 페이지 번호만 있으면 몇 건을 보고 있는지 운영자가 계산해야 합니다.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="페이지 이동"
      className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3 sm:px-5"
    >
      <Button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <IconArrowLeft />
        이전
      </Button>

      <div className="flex flex-col items-center gap-1">
        <ol className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden className="w-8 text-center text-sm text-[var(--ink-subtle)]">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => onChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`${p} 페이지`}
                  className={cx(
                    'size-8 rounded-lg text-sm tabular-nums transition',
                    p === page
                      ? 'bg-[var(--color-brand-50)] font-semibold text-[var(--color-brand-700)] dark:bg-[var(--color-brand-700)]/25 dark:text-[var(--color-brand-400)]'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]',
                  )}
                >
                  {p}
                </button>
              </li>
            ),
          )}
        </ol>
        <p className="text-[11px] text-[var(--ink-subtle)] tabular-nums">
          전체 {formatNumber(total)}건 중 {from}–{to}
          <span className="sm:hidden">
            {' '}
            · {page}/{totalPages}쪽
          </span>
        </p>
      </div>

      <Button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        다음
        <IconArrowRight />
      </Button>
    </nav>
  );
}
