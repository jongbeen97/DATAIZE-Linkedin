'use client';

import { POST_STATUS_LABEL, POST_STATUS_COLOR, type PostStatus } from '@/entities/post';

/**
 * 상태 뱃지.
 *
 * 색은 entities/post 의 POST_STATUS_COLOR → globals.css 의 CSS 변수 한 곳에서만
 * 정의됩니다. 대시보드의 분포 막대와 이 뱃지가 같은 출처를 보므로,
 * "발행 완료는 어느 화면에서나 초록" 이라는 규칙이 구조적으로 지켜집니다.
 */
export function StatusBadge({ status }: { status: PostStatus }) {
  const color = POST_STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{
        // 같은 색상값에서 점 · 글자 · 배경 · 테두리를 파생시켜 색 목록을 늘리지 않습니다
        color,
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {POST_STATUS_LABEL[status]}
    </span>
  );
}
