'use client';

import { Button, Modal } from '@/shared/ui';
import type { PostAction, PostActionKind } from './types';

/**
 * 되돌릴 수 없는 작업 앞의 확인 모달.
 *
 * 세 동작 모두 "무엇이 실제로 일어나는가"를 먼저 말합니다.
 * 특히 [LinkedIn에서 삭제]는 우리 DB 가 아니라 **LinkedIn 의 실제 글**이
 * 사라지는 동작이라, 오해하지 않도록 문구를 따로 두었습니다.
 */
const TITLE: Record<PostActionKind, string> = {
  publish: '실제 LinkedIn 에 게시됩니다',
  unpublish: '실제 LinkedIn 게시물을 삭제합니다',
  delete: '게시물을 삭제할까요?',
};

const CONFIRM_LABEL: Record<PostActionKind, string> = {
  publish: '네, 지금 게시합니다',
  unpublish: '네, LinkedIn 에서 삭제합니다',
  delete: '삭제',
};

export function PostActionModal({
  action,
  onCancel,
  onConfirm,
}: {
  action: PostAction | null;
  onCancel: () => void;
  onConfirm: (action: PostAction) => void;
}) {
  const kind = action?.kind;

  return (
    <Modal
      open={action !== null}
      title={kind ? TITLE[kind] : ''}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            취소
          </Button>
          <Button
            variant={kind === 'publish' ? 'primary' : 'danger'}
            onClick={() => action && onConfirm(action)}
          >
            {kind ? CONFIRM_LABEL[kind] : ''}
          </Button>
        </>
      }
    >
      {action && <ActionDescription action={action} />}
    </Modal>
  );
}

function ActionDescription({ action }: { action: PostAction }) {
  const { post, kind } = action;

  if (kind === 'delete') {
    return (
      <p>
        &lsquo;{post.title}&rsquo; 게시물을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
      </p>
    );
  }

  if (kind === 'unpublish') {
    return (
      <div className="space-y-2 leading-relaxed">
        <p>
          &lsquo;{post.title}&rsquo; 을(를){' '}
          <strong className="text-[var(--ink)]">LinkedIn 에서 실제로 삭제합니다.</strong> 이 작업은
          되돌릴 수 없습니다.
        </p>
        <p className="text-[var(--ink-muted)]">
          관리자 페이지의 기록은 <strong>LinkedIn 삭제됨</strong> 상태로 남습니다. 노출·반응 등 성과
          지표와 이 글을 통해 들어온 리드 정보는 그대로 보존됩니다.
        </p>
        <p className="text-[var(--ink-muted)]">
          이미 LinkedIn 에서 지우신 글이라면, 상태만 정정됩니다.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="leading-relaxed">
        이 작업은 <strong className="text-[var(--ink)]">되돌릴 수 없습니다.</strong> 게시 후에는
        LinkedIn 에서 직접 수정·삭제해야 합니다.
      </p>
      {/* 발행 직전에 본문을 한 번 더 보여줍니다 — 오타를 마지막으로 잡을 기회 */}
      <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-3 text-xs leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>
    </>
  );
}
