'use client';

import Link from 'next/link';
import { formatNumber, cx } from '@/shared/lib/format';

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** CSS 색상값 (보통 var(--status-*)) */
  color: string;
  href?: string;
  /** 강조해야 하는 항목 (예: 실패 건) */
  alert?: boolean;
}

/**
 * 누적 분포 막대 + 범례.
 *
 * 카드 N개로 숫자를 흩뿌리는 대신 한 줄의 막대로 비율을 보여주고,
 * 범례를 클릭하면 해당 조건으로 필터된 목록으로 이동합니다.
 * → 화면 높이를 아끼면서 "전체 중 얼마"라는 정보가 추가로 생깁니다.
 */
export function SegmentedBar({ segments, emptyLabel = '데이터가 없습니다' }: {
  segments: Segment[];
  emptyLabel?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div>
      <div
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
        role="img"
        aria-label={`전체 ${total}건의 상태별 분포`}
      >
        {visible.length === 0 ? (
          <div className="h-full w-full bg-[var(--line)]" />
        ) : (
          visible.map((s) => (
            <div
              key={s.key}
              title={`${s.label} ${formatNumber(s.value)}건`}
              className="h-full rounded-full transition-all"
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            />
          ))
        )}
      </div>

      {total === 0 ? (
        <p className="mt-3 text-xs text-[var(--ink-muted)]">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {segments.map((s) => {
            const body = (
              <>
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color, opacity: s.value > 0 ? 1 : 0.35 }}
                />
                <span className={cx(s.value === 0 && 'text-[var(--ink-subtle)]')}>{s.label}</span>
                <strong
                  className={cx(
                    'tabular-nums',
                    s.value === 0 ? 'text-[var(--ink-subtle)] font-normal' : 'font-semibold',
                    s.alert && s.value > 0 && 'text-[var(--status-failed)]',
                  )}
                >
                  {formatNumber(s.value)}
                </strong>
              </>
            );
            return (
              <li key={s.key}>
                {s.href ? (
                  <Link
                    href={s.href}
                    className="flex items-center gap-1.5 text-xs transition hover:opacity-70"
                  >
                    {body}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
