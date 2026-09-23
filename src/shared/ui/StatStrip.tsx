import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/format';

export interface Stat {
  key: string;
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  /** 값 옆의 짧은 막대 색 — 상태 색 토큰을 그대로 넘깁니다 */
  color?: string;
  /** 누르면 이동할 곳(예: 해당 상태로 필터된 목록) */
  href?: string;
  active?: boolean;
}

/**
 * 핵심 수치 가로 띠.
 *
 * 4칸 기준(모바일에서는 2×2)으로 배치합니다.
 * 카드 여러 장 대신 세로 구분선만 둔 한 줄로 묶었습니다.
 * 테두리 · 그림자가 수치마다 반복되지 않아 숫자 자체가 먼저 읽힙니다.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-y-5 border-b border-[var(--line)] pb-6 lg:grid-cols-4">
      {stats.map((s, i) => {
        const body = (
          <>
            <p className="text-sm text-[var(--ink-muted)]">{s.label}</p>
            <p className="mt-1 flex items-center gap-2.5">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{s.value}</span>
              {s.color && (
                <span
                  aria-hidden
                  className="h-[3px] w-3.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
              )}
            </p>
            {s.caption && <p className="mt-1 text-xs text-[var(--ink-subtle)]">{s.caption}</p>}
          </>
        );
        return (
          <div
            key={s.key}
            className={cx(
              'min-w-0 border-[var(--line)] pr-4 sm:pr-6',
              // 줄의 첫 칸에는 구분선을 두지 않습니다 (모바일 2열 · 데스크톱 4열)
              i % 2 === 1 && 'border-l pl-4 sm:pl-6',
              i === 2 && 'lg:border-l lg:pl-6',
            )}
          >
            {s.href ? (
              <Link
                href={s.href}
                aria-current={s.active ? 'true' : undefined}
                className={cx(
                  '-mx-2 block rounded-lg px-2 py-1 transition hover:bg-[var(--surface-sunken)]',
                  s.active && 'bg-[var(--surface-sunken)]',
                )}
              >
                {body}
              </Link>
            ) : (
              <div className="py-1">{body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
