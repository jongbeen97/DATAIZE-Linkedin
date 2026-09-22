'use client';

import { Badge, type BadgeTone } from '@/shared/ui/primitives';
import { POST_STATUS_LABEL, type PostStatus } from '@/entities/post';

/**
 * 상태 뱃지 — 색은 단 한 곳(여기)에서만 정의합니다.
 * 대시보드/목록/상세 어디서나 같은 상태는 항상 같은 색으로 보입니다. (UX 일관성)
 */
const TONE_BY_STATUS: Record<PostStatus, BadgeTone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'violet',
  PUBLISHING: 'amber',
  PUBLISHED: 'green',
  FAILED: 'rose',
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <Badge tone={TONE_BY_STATUS[status]} dot>
      {POST_STATUS_LABEL[status]}
    </Badge>
  );
}
