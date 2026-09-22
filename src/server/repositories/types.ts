import type { ObjectId } from 'mongodb';
import type { PostStatus, PostVisibility, MetricsSource } from '@/entities/post';
import type { LeadStatus, LeadSource } from '@/entities/lead';

/**
 * MongoDB 문서(Document) 타입.
 *
 * 중요: 도메인 모델(entities/*)과 DB 문서 타입을 분리했습니다.
 *  - 문서 타입은 _id: ObjectId, 날짜는 Date 객체
 *  - 도메인 모델은 id: string, 날짜는 ISO 문자열 (JSON 직렬화 가능)
 * repository 가 둘 사이를 매핑(toDomain)합니다.
 * → DB 스키마가 바뀌어도 화면 코드는 영향을 받지 않습니다.
 */

export interface UserDoc {
  _id?: ObjectId;
  linkedinSub: string;
  personUrn: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface OAuthTokenDoc {
  _id?: ObjectId;
  userId: ObjectId;
  /** AES-256-GCM 으로 암호화된 액세스 토큰 */
  accessTokenEnc: string;
  expiresAt: Date;
  scopes: string[];
  updatedAt: Date;
}

export interface PostDoc {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  content: string;
  visibility: PostVisibility;
  status: PostStatus;
  scheduledAt: Date | null;
  idempotencyKey: string | null;
  linkedinUrn: string | null;
  linkedinUrl: string | null;
  publishedAt: Date | null;
  failReason: string | null;
  failCode: string | null;
  publishAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostMetricsDoc {
  _id?: ObjectId;
  postId: ObjectId;
  collectedAt: Date;
  source: MetricsSource;
  impressions: number;
  membersReached: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
}

export interface LeadDoc {
  _id?: ObjectId;
  name: string;
  email: string;
  company: string | null;
  source: LeadSource;
  referrerPostId: ObjectId | null;
  status: LeadStatus;
  createdAt: Date;
}

export interface ApiCallLogDoc {
  _id?: ObjectId;
  userId: ObjectId | null;
  direction: 'outbound';
  service: 'linkedin';
  method: string;
  endpoint: string;
  statusCode: number | null;
  durationMs: number;
  success: boolean;
  errorCode: string | null;
  /** 민감 정보는 제거한 뒤 저장 (README 참고) */
  requestSummary: string | null;
  responseSummary: string | null;
  createdAt: Date;
}
