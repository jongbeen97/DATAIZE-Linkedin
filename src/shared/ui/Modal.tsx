'use client';

import type { ReactNode } from 'react';

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
