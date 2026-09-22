import { z } from 'zod';

/**
 * 환경변수도 "경계에서 검증한다"는 원칙을 그대로 적용합니다.
 * 서버가 뜨는 순간 잘못된 설정을 발견하게 해서,
 * 런타임 한참 뒤에 undefined 로 터지는 상황을 막습니다.
 */
const envSchema = z.object({
  APP_BASE_URL: z.string().url(),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI 가 비어 있습니다. .env.local 을 확인하세요.'),
  MONGODB_DB: z.string().min(1).default('dataize_admin'),

  LINKEDIN_CLIENT_ID: z.string().min(1, 'LINKEDIN_CLIENT_ID 가 비어 있습니다.'),
  LINKEDIN_CLIENT_SECRET: z.string().min(1, 'LINKEDIN_CLIENT_SECRET 가 비어 있습니다.'),
  LINKEDIN_REDIRECT_URI: z.string().url(),
  LINKEDIN_API_VERSION: z.string().regex(/^\d{6}$/, 'LINKEDIN_API_VERSION 은 YYYYMM 형식입니다.'),

  SESSION_SECRET: z
    .string()
    .length(64, 'SESSION_SECRET 은 32바이트 hex(64자)여야 합니다. README 의 생성 명령을 참고하세요.'),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .length(64, 'TOKEN_ENCRYPTION_KEY 는 32바이트 hex(64자)여야 합니다.'),

  METRICS_PROVIDER: z.enum(['linkedin', 'sample']).default('sample'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`[환경변수 설정 오류]\n${lines.join('\n')}\n\n.env.example 을 참고해 .env.local 을 채워주세요.`);
  }
  cached = parsed.data;
  return cached;
}
