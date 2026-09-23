import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const { error } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--canvas)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-sm">
          <p className="text-xs font-semibold tracking-widest text-[var(--color-brand-600)]">
            DATAIZE ADMIN
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight">LinkedIn 운영 관리자</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
            게시물 작성부터 실제 LinkedIn 발행, 성과와 유입 현황까지 한 화면에서 관리합니다.
          </p>

          {/* 로그인 실패 사유를 화면에 그대로 보여준다 (원인을 숨기지 않는다) */}
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-800 dark:bg-rose-950 dark:text-rose-200"
            >
              <strong className="font-semibold">로그인에 실패했습니다.</strong>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <a
            href="/api/auth/linkedin"
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0A66C2] text-sm font-semibold text-white transition hover:bg-[#004182]"
          >
            <span aria-hidden className="grid size-5 place-items-center rounded-sm bg-white text-[11px] font-black text-[#0A66C2]">
              in
            </span>
            LinkedIn 계정으로 로그인
          </a>

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--ink-muted)]">
            요청 권한: <code className="rounded bg-[var(--canvas)] px-1">openid</code>{' '}
            <code className="rounded bg-[var(--canvas)] px-1">profile</code>{' '}
            <code className="rounded bg-[var(--canvas)] px-1">email</code>{' '}
            <code className="rounded bg-[var(--canvas)] px-1">w_member_social</code>
            <br />
            액세스 토큰은 서버에 AES-256-GCM 으로 암호화되어 저장되며, 브라우저로 전달되지 않습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
