import { z } from 'zod';
import { LINKEDIN_MAX_CONTENT_LENGTH, POST_STATUSES } from '@/entities/post';

/**
 * 게시물 입력 검증 스키마.
 *
 * ★ 이 스키마 하나를 프론트(폼 검증)와 백엔드(API 검증)가 함께 사용합니다.
 *   - 검증 규칙이 한 곳에만 존재 → 두 곳이 어긋날 수 없음
 *   - z.infer 로 타입이 자동 생성 → 타입과 검증이 항상 일치
 *   (Spring 의 @Valid + DTO 와 같은 역할이되, 프론트/백이 공유한다는 점이 다릅니다)
 */

export const createPostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, '제목을 입력해 주세요.')
      .max(100, '제목은 100자 이내로 입력해 주세요.'),
    content: z
      .string()
      .trim()
      .min(1, '본문을 입력해 주세요.')
      .max(
        LINKEDIN_MAX_CONTENT_LENGTH,
        `LinkedIn 본문은 ${LINKEDIN_MAX_CONTENT_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.`,
      ),
    visibility: z.enum(['PUBLIC', 'CONNECTIONS']).default('PUBLIC'),
    status: z.enum(['DRAFT', 'SCHEDULED']).default('DRAFT'),
    scheduledAt: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  .refine((v) => v.status !== 'SCHEDULED' || v.scheduledAt !== null, {
    message: '예약 상태로 저장하려면 예약 시각을 선택해 주세요.',
    path: ['scheduledAt'],
  })
  .refine((v) => v.scheduledAt === null || new Date(v.scheduledAt).getTime() > Date.now(), {
    message: '예약 시각은 현재 시각 이후여야 합니다.',
    path: ['scheduledAt'],
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = createPostSchema;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/** 목록 조회 쿼리스트링 검증 */
export const listPostsQuerySchema = z.object({
  status: z.enum(POST_STATUSES).optional(),
  keyword: z.string().trim().max(100).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
