'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/shared/lib/format';
import { apiCall } from '@/shared/lib/http';
import {
  IconActivity,
  IconChevronDown,
  IconFile,
  IconGrid,
  IconLogout,
  IconSearch,
  IconUsers,
  Menu,
} from '@/shared/ui';
import type { SessionUser } from '@/entities/user';

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  children?: NavChild[];
}

/**
 * 메뉴는 "매일 하는 일"과 "문제가 생겼을 때 보는 곳"으로 나눴습니다.
 * 연동 로그는 평소에는 찾지 않다가 게시가 실패했을 때 들어가는 화면이라 아래 묶음에 둡니다.
 */
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: '메인 메뉴',
    items: [
      { href: '/dashboard', label: '대시보드', icon: <IconGrid /> },
      {
        href: '/posts',
        label: 'SNS 게시물',
        icon: <IconFile />,
        children: [
          { href: '/posts', label: '전체 게시물' },
          { href: '/posts/new', label: '새 게시물 작성' },
        ],
      },
      { href: '/leads', label: '유입 · Lead', icon: <IconUsers /> },
    ],
  },
  {
    title: '운영 도구',
    items: [{ href: '/logs', label: '연동 로그', icon: <IconActivity /> }],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 관리자 공통 레이아웃.
 *
 * 한 톤 가라앉힌 사이드바(탐색) + 흰 본문(작업)으로 영역을 나눕니다.
 * 화면 제목은 헤더 바가 아니라 각 화면의 PageHeader 가 갖습니다 —
 * 제목 옆에 그 화면의 주요 동작 버튼을 함께 둘 수 있기 때문입니다.
 */
export function AdminShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiCall('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh">
      {/* ------------------------- 사이드바 ------------------------- */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-[var(--sidebar)] lg:flex">
        <div className="px-5 pt-6">
          <Logo />
          <div className="mt-6">
            {/* useSearchParams 는 Suspense 경계가 필요합니다 */}
            <Suspense fallback={<div className="h-9" />}>
              <SidebarSearch />
            </Suspense>
          </div>
        </div>

        <nav aria-label="주 메뉴" className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mt-6 first:mt-2">
              <p className="-mx-1 px-2 pb-2 text-[13px] text-[var(--ink-subtle)]">{section.title}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <NavEntry key={item.href} item={item} pathname={pathname} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-5">
          <div className="flex items-center gap-3">
            <Avatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-[11px] text-[var(--ink-muted)]">LinkedIn 연동됨</p>
            </div>
            <Menu
              label="계정 메뉴"
              trigger={<IconChevronDown />}
              items={[
                {
                  key: 'logout',
                  label: '로그아웃',
                  icon: <IconLogout />,
                  onSelect: () => void logout(),
                },
              ]}
            />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 — 사이드바 대신 상단 바 + 가로 탭 */}
        <div className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo />
            <div className="flex items-center gap-2">
              <Avatar user={user} />
              <button
                onClick={() => void logout()}
                aria-label="로그아웃"
                className="grid size-8 place-items-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]"
              >
                <IconLogout />
              </button>
            </div>
          </div>
          <nav aria-label="주 메뉴" className="flex gap-1 overflow-x-auto px-3 pb-2">
            {ALL_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
                  isActive(pathname, item.href)
                    ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-700)]/25 dark:text-[var(--color-brand-400)]'
                    : 'text-[var(--ink-muted)]',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 레퍼런스처럼 본문은 사이드바에 붙여 왼쪽 정렬합니다. 가운데 정렬하면 넓은 모니터에서 사이드바와 본문 사이가 크게 빕니다 */}
        <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-10 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-[var(--color-brand-500)] text-sm font-bold text-white"
      >
        D
      </span>
      <span className="text-[17px] font-bold tracking-tight">DATAIZE</span>
    </Link>
  );
}

function Avatar({ user }: { user: SessionUser }) {
  return user.avatarUrl ? (
    // 외부 이미지 도메인 설정 없이 동작하도록 next/image 대신 img 사용
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
  ) : (
    <div
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-sm font-bold text-[var(--color-brand-700)]"
    >
      {user.name.slice(0, 1)}
    </div>
  );
}

function NavEntry({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  // 하위 메뉴가 있는 항목은 현재 위치일 때 기본으로 펼칩니다
  const [expanded, setExpanded] = useState(active);
  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  const activeChildHref = item.children
    ?.filter((c) => isActive(pathname, c.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // 레퍼런스처럼 글자는 항상 진하게 두고, '현재 위치'는 아이콘 색과 옅은 회색 면으로만 표시합니다
  const rowClass = cx(
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-[var(--ink)] transition',
    active && !item.children
      ? 'bg-[var(--nav-active)] font-medium'
      : 'hover:bg-[var(--nav-active)]',
  );
  const icon = (
    <span
      className={cx(
        'shrink-0',
        active
          ? 'text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]'
          : 'text-[var(--ink-muted)]',
      )}
    >
      {item.icon}
    </span>
  );

  if (!item.children) {
    return (
      <li>
        <Link href={item.href} aria-current={active ? 'page' : undefined} className={rowClass}>
          {icon}
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={rowClass}
      >
        {icon}
        <span className="flex-1 text-left">{item.label}</span>
        <IconChevronDown
          size={14}
          className={cx('transition-transform', expanded ? 'rotate-180' : '')}
        />
      </button>
      {expanded && (
        // 하위 메뉴는 왼쪽 세로선으로 "어느 메뉴에 속하는지"를 형태로 보여줍니다
        <ul className="mt-0.5 mb-1 ml-[21px] space-y-0.5 border-l border-[var(--line)] pl-4">
          {item.children.map((child) => {
            // 여러 하위 메뉴가 겹치면 가장 구체적인(긴) 경로 하나만 선택합니다
            // → /posts/abc 는 '전체 게시물', /posts/new 는 '새 게시물 작성'
            const childActive = child.href === activeChildHref;
            return (
              <li key={child.href} className="relative">
                {/* 선택된 하위 메뉴로 세로선에서 가지를 한 번 꺾어 '어디에 속한 어느 항목인지'를 보여줍니다 */}
                {childActive && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -left-4 h-px w-3 bg-[var(--line-strong)]"
                  />
                )}
                <Link
                  href={child.href}
                  aria-current={childActive ? 'page' : undefined}
                  className={cx(
                    'block rounded-lg px-3 py-2 text-[15px] transition',
                    childActive
                      ? 'bg-[var(--nav-active)] font-medium text-[var(--ink)]'
                      : 'text-[var(--ink)]/80 hover:bg-[var(--nav-active)] hover:text-[var(--ink)]',
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/**
 * 사이드바 검색 — 어느 화면에서든 게시물을 바로 찾습니다.
 * Ctrl+K (Mac 은 ⌘K) 로 포커스되고, 제출하면 검색어로 필터된 게시물 목록이 열립니다.
 */
function SidebarSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [isMac, setIsMac] = useState(false);

  // 게시물 목록에서 검색 중이면 그 검색어를 그대로 보여줍니다
  useEffect(() => {
    setValue(pathname === '/posts' ? (params.get('keyword') ?? '') : '');
  }, [pathname, params]);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/posts?keyword=${encodeURIComponent(q)}` : '/posts');
      }}
      className="flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 focus-within:border-[var(--color-brand-500)]"
    >
      <IconSearch size={17} className="shrink-0 text-[var(--ink)]" />
      <label htmlFor="global-search" className="sr-only">
        게시물 검색
      </label>
      <input
        ref={inputRef}
        id="global-search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="게시물 검색"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-subtle)]"
      />
      <kbd className="shrink-0 font-sans text-xs text-[var(--ink-muted)]">
        {isMac ? '⌘ + K' : 'Ctrl + K'}
      </kbd>
    </form>
  );
}
