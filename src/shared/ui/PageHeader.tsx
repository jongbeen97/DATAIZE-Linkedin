import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconHome } from './icons';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * 화면 머리말 — 경로(breadcrumb) · 제목 · 설명 · 주요 동작.
 *
 * 모든 화면이 같은 자리에 같은 순서로 이 네 가지를 둡니다.
 * "지금 어디에 있고, 여기서 무엇을 할 수 있는가"를 화면마다 다시 찾지 않도록.
 */
export function PageHeader({
  crumbs,
  title,
  description,
  actions,
}: {
  crumbs: Crumb[];
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <nav aria-label="현재 위치" className="mb-4 flex items-center gap-2 text-sm">
        <Link
          href="/dashboard"
          aria-label="대시보드"
          className="text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
        >
          <IconHome />
        </Link>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={`${c.label}-${i}`} className="flex items-center gap-2">
              <span aria-hidden className="text-[var(--ink-subtle)]">
                /
              </span>
              {c.href && !last ? (
                <Link href={c.href} className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={
                    last
                      ? 'font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]'
                      : 'text-[var(--ink-muted)]'
                  }
                >
                  {c.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 sm:flex-nowrap">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
