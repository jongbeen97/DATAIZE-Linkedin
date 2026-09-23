'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '@/shared/lib/format';

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  /** 내부 이동 */
  href?: string;
  /** 새 탭으로 여는 외부 링크 */
  externalHref?: string;
  onSelect?: () => void;
  danger?: boolean;
}

/**
 * 작은 드롭다운 메뉴.
 *
 * 자주 쓰지 않거나 되돌릴 수 없는 동작(삭제 등)을 한 단계 뒤로 숨겨,
 * 목록의 한 줄에 버튼이 줄지어 서지 않게 합니다.
 * 바깥 클릭 · Esc 로 닫히고, 닫힐 때 포커스는 여는 버튼으로 돌아갑니다.
 *
 * 표는 가로 스크롤 컨테이너(overflow-x: auto) 안에 있어 absolute 로 띄우면 잘립니다.
 * 그래서 버튼 위치를 기준으로 fixed 로 띄우고, 아래 공간이 모자라면 위로 엽니다.
 * 스크롤 · 창 크기 변경 시에는 위치가 어긋나므로 닫습니다.
 */
export function Menu({
  label,
  trigger,
  items,
  align = 'end',
  triggerClassName,
}: {
  /** 스크린리더용 이름 */
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function close() {
      setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      // 항목 하나 ≈ 36px. 아래에 들어갈 자리가 없으면 위로 엽니다
      const estimated = items.length * 36 + 12;
      const openUp = rect.bottom + estimated > window.innerHeight && rect.top > estimated;
      setPosition({
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        ...(align === 'end'
          ? { right: window.innerWidth - rect.right }
          : { left: rect.left }),
      });
    }
    setOpen(true);
  }

  if (items.length === 0) return null;

  const itemClass = (danger?: boolean) =>
    cx(
      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition',
      danger
        ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50'
        : 'text-[var(--ink)] hover:bg-[var(--surface-sunken)]',
    );

  return (
    <div ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className={cx(
          'grid place-items-center rounded-lg text-[var(--ink-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]',
          triggerClassName ?? 'size-8',
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="fixed z-40 min-w-44 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]"
          style={{ ...position, animation: 'dz-fade-up .12s ease-out' }}
        >
          {items.map((item) => {
            const content = (
              <>
                {item.icon && <span className="shrink-0 opacity-80">{item.icon}</span>}
                {item.label}
              </>
            );
            if (item.href) {
              return (
                <Link
                  key={item.key}
                  role="menuitem"
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={itemClass(item.danger)}
                >
                  {content}
                </Link>
              );
            }
            if (item.externalHref) {
              return (
                <a
                  key={item.key}
                  role="menuitem"
                  href={item.externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className={itemClass(item.danger)}
                >
                  {content}
                </a>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={itemClass(item.danger)}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
