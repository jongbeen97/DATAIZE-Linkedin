'use client';

import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/format';

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx(
        'rounded-xl border border-[var(--line)] bg-[var(--surface)]',
        'shadow-[var(--shadow-sm)]',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h2 className="text-[13px] font-semibold tracking-tight text-[var(--ink)]">{children}</h2>
      {right}
    </header>
  );
}
