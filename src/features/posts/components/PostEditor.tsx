'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardTitle, Modal, Badge } from '@/shared/ui/primitives';
import { useToast } from '@/shared/ui/toast';
import { hintFor } from '@/shared/lib/http';
import { cx } from '@/shared/lib/format';
import { LINKEDIN_MAX_CONTENT_LENGTH, type Post, type PostVisibility } from '@/entities/post';
import { createPostSchema } from '../model/schema';
import * as api from '../api/postsApi';

type FieldErrors = Partial<Record<'title' | 'content' | 'scheduledAt', string[]>>;

/**
 * 게시물 작성/수정 화면.
 *
 * UX 상 의도적으로 넣은 장치들:
 *  - 실시간 글자수 카운터 (LinkedIn 3,000자 제한을 넘기 전에 알려준다)
 *  - 미리보기 (실제 LinkedIn 에서 어떻게 보일지 확인 후 게시)
 *  - 임시저장 (브라우저를 닫아도 입력 내용이 남는다)
 *  - 게시 전 확인 모달 (되돌릴 수 없는 작업에는 마찰을 넣는다)
 */
export function PostEditor({ initial }: { initial?: Post }) {
  const router = useRouter();
  const toast = useToast();

  const isEdit = Boolean(initial);
  const draftKey = `dz_draft_${initial?.id ?? 'new'}`;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [visibility, setVisibility] = useState<PostVisibility>(initial?.visibility ?? 'PUBLIC');
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduledAt ? toLocalInputValue(initial.scheduledAt) : '',
  );

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  /* --------- 임시저장: 작성 중 내용이 날아가지 않도록 --------- */
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as { title: string; content: string };
      if (d.title || d.content) {
        setTitle(d.title);
        setContent(d.content);
        setRestoredDraft(true);
      }
    } catch {
      /* 시크릿 모드 등에서 실패할 수 있으므로 무시 */
    }
  }, [draftKey, isEdit]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, content }));
      } catch {
        /* 저장 실패해도 작성은 계속 가능해야 한다 */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [draftKey, title, content]);

  const remaining = LINKEDIN_MAX_CONTENT_LENGTH - content.length;
  const overLimit = remaining < 0;
  const nearLimit = remaining >= 0 && remaining < 200;

  const payload = useMemo(
    () => ({
      title,
      content,
      visibility,
      status: (scheduledAt ? 'SCHEDULED' : 'DRAFT') as 'SCHEDULED' | 'DRAFT',
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    }),
    [title, content, visibility, scheduledAt],
  );

  /** 서버로 보내기 전에 같은 zod 스키마로 먼저 검증 → 왕복 한 번을 아낀다 */
  function validate(): boolean {
    const parsed = createPostSchema.safeParse(payload);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    setErrors(parsed.error.flatten().fieldErrors as FieldErrors);
    return false;
  }

  async function handleSave(): Promise<string | null> {
    if (!validate()) return null;
    setSaving(true);
    const res = isEdit
      ? await api.updatePost(initial!.id, payload)
      : await api.createPost(payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(`${res.error.message} ${hintFor(res.error)}`);
      if (res.error.code === 'VALIDATION_FAILED') setErrors(res.error.details as FieldErrors);
      return null;
    }
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* noop */
    }
    toast.success(scheduledAt ? '예약 게시물로 저장했습니다.' : '초안으로 저장했습니다.');
    return res.data.id;
  }

  async function handlePublish() {
    setConfirmOpen(false);
    const id = isEdit ? initial!.id : await handleSave();
    if (!id) return;

    // 수정 화면에서는 내용을 먼저 저장한 뒤 발행해야 최신 본문이 올라간다
    if (isEdit) {
      const saved = await handleSave();
      if (!saved) return;
    }

    setPublishing(true);
    const res = await api.publishPost(id);
    setPublishing(false);

    if (!res.ok) {
      toast.error(`${res.error.message} ${hintFor(res.error)}`);
      router.push(`/posts?status=FAILED`);
      return;
    }

    toast.success(
      'LinkedIn 에 게시되었습니다.',
      res.data.linkedinUrl ? { url: res.data.linkedinUrl, label: 'LinkedIn 에서 보기' } : undefined,
    );
    router.push('/posts?status=PUBLISHED');
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* ------------------------- 작성 영역 ------------------------- */}
      <Card>
        <CardTitle
          right={
            restoredDraft ? <Badge tone="amber">임시저장 내용을 불러왔습니다</Badge> : undefined
          }
        >
          {isEdit ? '게시물 수정' : '새 게시물 작성'}
        </CardTitle>

        <div className="space-y-4">
          <Field label="제목 (내부 관리용)" error={errors.title?.[0]} htmlFor="title">
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 9월 채용 브랜딩 포스트"
              className={inputClass(Boolean(errors.title))}
            />
            <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
              이 제목은 LinkedIn 에 전송되지 않습니다. 목록에서 찾기 위한 이름입니다.
            </p>
          </Field>

          <Field label="본문" error={errors.content?.[0]} htmlFor="content">
            <textarea
              id="content"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="LinkedIn 에 게시될 내용을 입력하세요."
              className={cx(inputClass(Boolean(errors.content)), 'resize-y leading-relaxed')}
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="text-[var(--ink-muted)]">줄바꿈은 그대로 반영됩니다.</span>
              {/* 제한에 걸리기 전에 미리 경고 */}
              <span
                className={cx(
                  'font-medium tabular-nums',
                  overLimit
                    ? 'text-rose-600'
                    : nearLimit
                      ? 'text-amber-600'
                      : 'text-[var(--ink-muted)]',
                )}
              >
                {content.length.toLocaleString()} / {LINKEDIN_MAX_CONTENT_LENGTH.toLocaleString()}
                {overLimit && ` (${Math.abs(remaining)}자 초과)`}
              </span>
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="공개 범위" htmlFor="visibility">
              <select
                id="visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as PostVisibility)}
                className={inputClass(false)}
              >
                <option value="PUBLIC">전체 공개</option>
                <option value="CONNECTIONS">1촌만</option>
              </select>
            </Field>

            <Field label="예약 발행 (선택)" error={errors.scheduledAt?.[0]} htmlFor="scheduledAt">
              <input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={inputClass(Boolean(errors.scheduledAt))}
              />
              <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                비워두면 초안으로 저장됩니다.
              </p>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
          <Button variant="ghost" onClick={() => router.push('/posts')}>
            취소
          </Button>
          <Button variant="secondary" loading={saving} onClick={() => void handleSave()}>
            저장만 하기
          </Button>
          <Button
            variant="primary"
            loading={publishing}
            disabled={overLimit || content.trim().length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            LinkedIn 에 게시
          </Button>
        </div>
      </Card>

      {/* ------------------------- 미리보기 ------------------------- */}
      <Card className="h-fit lg:sticky lg:top-6">
        <CardTitle right={<Badge tone="blue">미리보기</Badge>}>
          LinkedIn 에서 이렇게 보입니다
        </CardTitle>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <div aria-hidden className="size-9 rounded-full bg-[var(--color-brand-100)]" />
            <div>
              <p className="text-xs font-semibold">내 LinkedIn 계정</p>
              <p className="text-[10px] text-[var(--ink-muted)]">
                방금 전 · {visibility === 'PUBLIC' ? '전체 공개' : '1촌만'}
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">
            {content || <span className="text-[var(--ink-muted)]">본문을 입력하면 여기에 표시됩니다.</span>}
          </p>
        </div>
      </Card>

      {/* --------------- 되돌릴 수 없는 작업의 확인 모달 --------------- */}
      <Modal
        open={confirmOpen}
        title="실제 LinkedIn 에 게시됩니다"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={() => void handlePublish()}>
              네, 지금 게시합니다
            </Button>
          </>
        }
      >
        <p className="leading-relaxed">
          이 작업은 <strong className="text-[var(--ink)]">되돌릴 수 없습니다.</strong> 게시 후에는
          관리자 페이지에서 내용을 수정하거나 삭제할 수 없으며, LinkedIn 에서 직접 처리해야 합니다.
        </p>
        <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------ 보조 ------------------------------ */

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* label 과 input 을 연결해야 스크린리더/클릭 포커스가 정상 동작한다 */}
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-[11px] font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return cx(
    'w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm outline-none transition',
    hasError ? 'border-rose-400' : 'border-[var(--line)] focus:border-[var(--color-brand-500)]',
  );
}

/** ISO 문자열 → <input type="datetime-local"> 이 요구하는 로컬 시각 문자열 */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
