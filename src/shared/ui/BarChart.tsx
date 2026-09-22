'use client';

import { formatNumber } from '@/shared/lib/format';

/**
 * 의존성 없이 SVG 로 직접 그린 막대 차트.
 * 차트 라이브러리를 하나 더 얹지 않아도 되는 단순한 용도라 직접 구현했습니다.
 */
export function BarChart({
  data,
  height = 160,
  label,
}: {
  data: Array<{ date: string; count: number }>;
  height?: number;
  label: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const barGap = 4;

  if (data.every((d) => d.count === 0)) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed border-[var(--line)] text-xs text-[var(--ink-muted)]"
        style={{ height }}
      >
        아직 데이터가 없습니다
      </div>
    );
  }

  return (
    <figure>
      <div className="flex items-end gap-1" style={{ height }} role="img" aria-label={label}>
        {data.map((d) => {
          const ratio = d.count / max;
          return (
            <div
              key={d.date}
              className="group relative flex flex-1 flex-col justify-end"
              style={{ minWidth: barGap }}
            >
              <div
                className="rounded-t bg-[var(--color-brand-500)] transition-all group-hover:bg-[var(--color-brand-700)]"
                style={{ height: `${Math.max(ratio * 100, d.count > 0 ? 6 : 1)}%` }}
              />
              {/* 툴팁 — 마우스를 올리면 정확한 값을 확인 */}
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-[var(--ink)] px-1.5 py-0.5 text-[10px] whitespace-nowrap text-[var(--surface)] group-hover:block">
                {d.date.slice(5)} · {formatNumber(d.count)}건
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-2 flex justify-between text-[10px] text-[var(--ink-muted)]">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </figcaption>
    </figure>
  );
}
