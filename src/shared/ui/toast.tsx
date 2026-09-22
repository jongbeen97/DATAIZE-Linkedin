'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cx } from '@/shared/lib/format';

/**
 * 토스트 알림.
 *
 * 작업 결과를 화면 어딘가가 바뀌는 것으로만 알리지 않고 명시적으로 피드백합니다.
 * 특히 "게시 성공" 토스트에는 실제 LinkedIn 링크를 함께 넣어
 * 운영자가 결과를 즉시 눈으로 확인할 수 있게 했습니다.
 */

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
}

interface ToastApi {
  show: (t: Omit<ToastItem, 'id'>) => void;
  success: (message: string, link?: { url: string; label: string }) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 는 <ToastProvider> 안에서만 사용할 수 있습니다.');
  return ctx;
}

const TONE_STYLE: Record<ToastTone, string> = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100',
  info: 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...t, id }]);
    // 링크가 있는 토스트는 읽고 누를 시간이 필요하므로 더 오래 띄운다
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), t.linkUrl ? 9000 : 4500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, link) =>
        show({ tone: 'success', message, linkUrl: link?.url, linkLabel: link?.label }),
      error: (message) => show({ tone: 'error', message }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live 로 스크린리더에도 결과가 전달되도록 */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(92vw,26rem)] flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg',
              TONE_STYLE[t.tone],
            )}
            style={{ animation: 'dz-fade-up .18s ease-out' }}
          >
            <p className="leading-relaxed">{t.message}</p>
            {t.linkUrl && (
              <a
                href={t.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-xs font-semibold underline underline-offset-2"
              >
                {t.linkLabel ?? '열기'} ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
