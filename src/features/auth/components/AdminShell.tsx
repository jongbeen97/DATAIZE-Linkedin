'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cx } from '@/shared/lib/format';
import { apiCall } from '@/shared/lib/http';
import type { SessionUser } from '@/entities/user';

const NAV = [
  { href: '/dashboard', label: '대시보드', desc: '운영 현황 한눈에 보기' },
  { href: '/posts', label: 'SNS 게시물', desc: '작성 · 발행 · 상태 관리' },
  { href: '/leads', label: '유입 · Lead', desc: '유입 경로와 리드 현황' },
  { href: '/logs', label: '연동 로그', desc: 'LinkedIn API 호출 기록' },
];

/**
 * 관리자 공통 레이아웃(사이드바 + 헤더).
 *
 * 메뉴에 설명 한 줄을 붙였습니다. 비개발 직군 운영자가
 * "어디 들어가야 내가 할 일이 있는지"를 이름만으로 추측하지 않아도 되도록.
 */
export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiCall('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const current = NAV.find((n) => pathname.startsWith(n.href));

  return (
    <div className="flex min-h-dvh">
      {/* ------------------------- 사이드바 ------------------------- */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-[var(--line)] bg-[var(--surface)] p-4 lg:block">
        <div className="flex items-center gap-2 px-2 py-1">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-lg bg-[var(--color-brand-600)] text-xs font-bold text-white"
          >
            D
          </span>
          <span className="text-xs font-semibold tracking-widest text-[var(--ink)]">
            DATAIZE ADMIN
          </span>
        </div>
        <nav className="mt-6 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative block rounded-lg py-2.5 pr-3 pl-4 transition',
                  active
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-700)]/20 dark:text-[var(--color-brand-400)]'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-sunken)]',
                )}
              >
                {/* 선택된 메뉴를 색만이 아니라 형태로도 구분 — 색각 이상 사용자 고려 */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--color-brand-600)] dark:bg-[var(--color-brand-400)]"
                  />
                )}
                <span className="block text-sm font-medium">{item.label}</span>
                <span
                  className={cx(
                    'mt-0.5 block text-[11px]',
                    active ? 'opacity-70' : 'text-[var(--ink-muted)]',
                  )}
                >
                  {item.desc}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ------------------------- 헤더 ------------------------- */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)]/85 px-5 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">
              {current?.label ?? '관리자'}
            </h1>
            <p className="truncate text-[11px] text-[var(--ink-muted)]">{current?.desc}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium">{user.name}</p>
              <p className="text-[10px] text-[var(--ink-muted)]">LinkedIn 연동됨</p>
            </div>
            {user.avatarUrl ? (
              // 외부 이미지 도메인 설정 없이 동작하도록 next/image 대신 img 사용
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <div aria-hidden className="grid size-8 place-items-center rounded-full bg-[var(--color-brand-100)] text-xs font-bold text-[var(--color-brand-700)]">
                {user.name.slice(0, 1)}
              </div>
            )}
            <button
              onClick={() => void logout()}
              className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs transition hover:bg-[var(--surface-sunken)]"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* 모바일용 탭 네비 — 화면이 좁아도 이동이 막히지 않게 */}
        <nav className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)]/85 px-3 py-2 backdrop-blur-md lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                pathname.startsWith(item.href)
                  ? 'bg-[var(--color-brand-600)] text-white'
                  : 'text-[var(--ink-muted)]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
