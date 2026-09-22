/**
 * 일자별 집계용 날짜 유틸.
 *
 * ⚠️ 이 파일이 존재하는 이유
 * MongoDB 의 $dateToString 은 timezone 옵션으로 KST 기준 날짜를 만드는데,
 * 애플리케이션이 Date.toISOString() 으로 키를 만들면 UTC 기준이 되어
 * 두 키가 하루씩 어긋납니다. (KST 00:00 = 전날 15:00 UTC)
 * 그 결과 오늘 데이터가 통째로 차트에서 사라집니다.
 * → 집계와 차트가 반드시 같은 타임존 기준의 키를 쓰도록 이 유틸로 일원화합니다.
 */

/** 집계·차트의 기준 타임존. 운영 담당자가 한국 시각으로 보기 때문에 KST 로 고정합니다. */
export const REPORT_TIMEZONE = 'Asia/Seoul';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date → 'YYYY-MM-DD' (REPORT_TIMEZONE 기준) */
export function toDateKey(date: Date, timeZone: string = REPORT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 오늘을 포함한 최근 N일의 날짜 키를 오래된 순으로 반환합니다. */
export function recentDateKeys(days: number, timeZone: string = REPORT_TIMEZONE): string[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) =>
    toDateKey(new Date(now - (days - 1 - i) * DAY_MS), timeZone),
  );
}

/**
 * 최근 N일 집계를 위한 조회 하한.
 * 타임존 경계에서 누락이 생기지 않도록 하루 여유를 둡니다.
 * 범위 밖 날짜는 키 목록에 없어 조회되지 않으므로 결과에 영향이 없습니다.
 */
export function sinceDaysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

/**
 * 집계 결과(날짜별 건수)를 최근 N일 배열로 채웁니다.
 * 데이터가 없는 날도 0 으로 채워야 차트가 끊기지 않습니다.
 */
export function fillDailySeries(
  rows: Array<{ _id: string; count: number }>,
  days: number,
): Array<{ date: string; count: number }> {
  const map = new Map(rows.map((r) => [r._id, r.count]));
  return recentDateKeys(days).map((date) => ({ date, count: map.get(date) ?? 0 }));
}
