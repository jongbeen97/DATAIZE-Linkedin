'use client';

import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cx } from '@/shared/lib/format';

/* ------------------------------------------------------------------ *
 * 공용 UI 프리미티브
 * 도메인을 모르는 순수 표현 컴포넌트만 이 파일에 둡니다. (shared 계층)
 * ------------------------------------------------------------------ */

/* --------------------------------- Card --------------------------- */

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

/* -------------------------------- Button -------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)]',
  secondary:
    'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--canvas)]',
  ghost: 'text-[var(--ink-muted)] hover:bg-[var(--canvas)]',
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
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
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

/* --------------------------------- Badge -------------------------- */

export type BadgeTone = 'neutral' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
};

export function Badge({
  tone = 'neutral',
  children,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        BADGE_TONES[tone],
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ------------------------- 상태 화면 3종 -------------------------- *
 * 로딩 / 빈 상태 / 에러 상태는 "있으면 좋은 것"이 아니라
 * 운영자가 화면 앞에서 멈추지 않게 하는 필수 요소입니다.
 * ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx('rounded-md bg-[var(--line)]', className)}
      style={{ animation: 'dz-pulse 1.4s ease-in-out infinite' }}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div
        aria-hidden
        className="grid size-11 place-items-center rounded-full bg-[var(--canvas)] text-lg"
      >
        ✦
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-[var(--ink-muted)]">{description}</p>
      {/* 빈 화면에서 끝내지 않고 반드시 '다음 행동'을 제시한다 */}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  hint,
  onRetry,
}: {
  message: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    >
      <div aria-hidden className="grid size-11 place-items-center rounded-full bg-rose-50 text-lg dark:bg-rose-950">
        !
      </div>
      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{message}</p>
      {/* 원인만 말하지 않고 '무엇을 하면 되는지'까지 알려준다 */}
      {hint && <p className="max-w-md text-xs leading-relaxed text-[var(--ink-muted)]">{hint}</p>}
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

/* --------------------------------- Modal -------------------------- */

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-md)]"
        style={{ animation: 'dz-fade-up .16s ease-out' }}
      >
        <h3 className="mb-3 text-base font-semibold">{title}</h3>
        <div className="text-sm text-[var(--ink-muted)]">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
