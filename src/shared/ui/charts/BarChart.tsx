'use client';

import { formatNumber } from '@/shared/lib/format';

/**
 * 의존성 없이 SVG/CSS 로 직접 그린 막대 차트.
 * 차트 라이브러리를 하나 더 얹지 않아도 되는 단순한 용도라 직접 구현했습니다.
 *
 * ⚠️ 막대 높이는 % 가 아니라 px 로 계산합니다.
 * 부모가 `align-items: flex-end` 이면 열(column)의 높이가 내용 기준(auto)이 되어
 * 자식의 `height: N%` 가 해석될 기준 높이를 잃고 0 으로 무너집니다.
 * (실제로 막대가 전혀 보이지 않는 버그가 있었습니다)
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

  if (data.every((d) => d.count === 0)) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed border-[var(--line-strong)] text-xs text-[var(--ink-muted)]"
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
          // 값이 있으면 최소 4px 을 보장해 '1건'도 눈에 보이게 하고,
          // 0 인 날은 1px 기준선만 남겨 '데이터 없음'과 '차트 끊김'을 구분합니다.
          const barPx = d.count > 0 ? Math.max(Math.round((d.count / max) * height), 4) : 1;
          return (
            <div
              key={d.date}
              className="group relative flex flex-1 flex-col justify-end"
              style={{ minWidth: 4 }}
            >
              <div
                className={
                  d.count > 0
                    ? 'rounded-t bg-[var(--color-brand-500)] transition-colors group-hover:bg-[var(--color-brand-700)]'
                    : 'rounded-t bg-[var(--line-strong)]'
                }
                style={{ height: barPx }}
              />
              {/* 툴팁 — 마우스를 올리면 정확한 값을 확인 */}
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-[var(--ink)] px-1.5 py-0.5 text-[10px] whitespace-nowrap text-[var(--surface)] group-hover:block">
                {d.date.slice(5)} · {formatNumber(d.count)}건
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-2 flex justify-between text-[10px] text-[var(--ink-muted)]">
        <span>{data[0]?.date.slice(5)}</span>
        <span>최대 {formatNumber(max)}건</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </figcaption>
    </figure>
  );
}
