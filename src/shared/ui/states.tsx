'use client';

import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/format';
import { Button } from './Button';

/* ------------------------------------------------------------------ *
 * 로딩 / 빈 상태 / 에러 상태
 *
 * "있으면 좋은 것"이 아니라 운영자가 화면 앞에서 멈추지 않게 하는 필수 요소입니다.
 * 세 가지를 한 파일에 모아 화면을 만들 때 항상 함께 떠올리도록 했습니다.
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
      <div
        aria-hidden
        className="grid size-11 place-items-center rounded-full bg-rose-50 text-lg dark:bg-rose-950"
      >
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
