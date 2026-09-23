'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/shared/lib/format';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--color-brand-500)] text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)] hover:bg-[var(--color-brand-600)]',
  secondary:
    'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-sunken)]',
  ghost: 'text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      // 로딩 중에는 반드시 비활성화 — 중복 클릭으로 LinkedIn 에 두 번 게시되는 것을 UI 에서도 1차 차단
      disabled={disabled || loading}
      aria-busy={loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm',
        BUTTON_VARIANTS[variant],
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
