'use client';

import Link from 'next/link';
import { Button, Card } from '@/shared/ui';
import type { DashboardSummary } from '../../model/dashboard';

/**
 * 대시보드 최상단 — 숫자보다 먼저 "오늘 조치할 것"을 보여줍니다.
 *
 * 조치할 게 없을 때도 빈칸으로 두지 않고 "없다"고 명시합니다.
 * 아무것도 없으면 운영자는 "화면이 안 뜬 건가?"를 의심하게 됩니다.
 */
export function ActionBanner({ actionRequired }: Pick<DashboardSummary, 'actionRequired'>) {
  const { failed, scheduled } = actionRequired;
  const needsAction = failed > 0 || scheduled > 0;

  if (!needsAction) {
    return (
      <Card className="border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          현재 조치가 필요한 항목이 없습니다
        </p>
        <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
          실패한 게시물과 대기 중인 예약 건이 모두 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            확인이 필요한 항목이 있습니다
          </p>
          <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
            {failed > 0 && `게시 실패 ${failed}건`}
            {failed > 0 && scheduled > 0 && ' · '}
            {scheduled > 0 && `예약 대기 ${scheduled}건`}
          </p>
        </div>
        {/* 숫자를 읽고 끝나지 않고 바로 해당 목록으로 이동시킵니다 */}
        <Link href={`/posts?status=${failed > 0 ? 'FAILED' : 'SCHEDULED'}`}>
          <Button size="sm" variant="primary">
            확인하러 가기 →
          </Button>
        </Link>
      </div>
    </Card>
  );
}
