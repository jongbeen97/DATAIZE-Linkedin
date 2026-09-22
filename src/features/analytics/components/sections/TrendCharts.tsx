'use client';

import { BarChart, Card, CardTitle } from '@/shared/ui';
import type { DashboardSummary } from '../../model/dashboard';

/**
 * 최근 14일 추이 2종.
 *
 * 발행(우리가 한 일)과 유입(그 결과)을 나란히 두어
 * 두 흐름의 시차를 눈으로 비교할 수 있게 했습니다.
 */
export function TrendCharts({
  dailyPublished,
  dailyLeads,
}: Pick<DashboardSummary, 'dailyPublished' | 'dailyLeads'>) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardTitle>최근 14일 발행 추이</CardTitle>
        <BarChart data={dailyPublished} label="최근 14일 일자별 발행 건수" />
      </Card>
      <Card>
        <CardTitle>최근 14일 신규 유입 (Lead)</CardTitle>
        <BarChart data={dailyLeads} label="최근 14일 일자별 신규 리드 수" />
      </Card>
    </div>
  );
}
