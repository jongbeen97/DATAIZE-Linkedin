'use client';

import { Button } from '@/shared/ui';
import { formatNumber } from '@/shared/lib/format';

/**
 * 페이지네이션.
 *
 * "전체 24건 중 1–10" 처럼 **지금 보고 있는 범위**를 함께 표시합니다.
 * 페이지 번호만 있으면 몇 건을 보고 있는지 운영자가 계산해야 합니다.
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
    <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--ink-muted)]">
      <span>
        전체 {formatNumber(total)}건 중 {from}–{to}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          이전
        </Button>
        <span className="tabular-nums">
          {page} / {totalPages}
        </span>
        <Button size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          다음
        </Button>
      </div>
    </div>
  );
}
