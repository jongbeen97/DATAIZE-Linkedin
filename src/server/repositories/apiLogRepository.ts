import { ObjectId } from 'mongodb';
import { collection, COLLECTIONS } from '@/server/db/mongo';
import type { ApiCallLogDoc } from './types';

export interface ApiCallLog {
  id: string;
  method: string;
  endpoint: string;
  statusCode: number | null;
  durationMs: number;
  success: boolean;
  errorCode: string | null;
  requestSummary: string | null;
  responseSummary: string | null;
  createdAt: string;
}

function toDomain(doc: ApiCallLogDoc): ApiCallLog {
  return {
    id: doc._id!.toHexString(),
    method: doc.method,
    endpoint: doc.endpoint,
    statusCode: doc.statusCode,
    durationMs: doc.durationMs,
    success: doc.success,
    errorCode: doc.errorCode,
    requestSummary: doc.requestSummary,
    responseSummary: doc.responseSummary,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** 응답 본문이 길면 잘라서 저장 (로그가 DB 를 잡아먹지 않도록) */
function clip(value: string | null, max = 800): string | null {
  if (!value) return null;
  return value.length <= max ? value : `${value.slice(0, max)}… (${value.length}자)`;
}

export async function writeApiCallLog(input: {
  userId: string | null;
  method: string;
  endpoint: string;
  statusCode: number | null;
  durationMs: number;
  success: boolean;
  errorCode: string | null;
  requestSummary: string | null;
  responseSummary: string | null;
}): Promise<void> {
  try {
    const col = await collection<ApiCallLogDoc>(COLLECTIONS.apiCallLogs);
    await col.insertOne({
      userId: input.userId ? new ObjectId(input.userId) : null,
      direction: 'outbound',
      service: 'linkedin',
      method: input.method,
      endpoint: input.endpoint,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      success: input.success,
      errorCode: input.errorCode,
      requestSummary: clip(input.requestSummary),
      responseSummary: clip(input.responseSummary),
      createdAt: new Date(),
    });
  } catch (e) {
    // 로그 저장 실패가 본 작업(게시)을 실패시키면 안 된다
    console.error('[apiCallLog] 저장 실패', e);
  }
}

export async function listApiCallLogs(userId: string, limit = 100): Promise<ApiCallLog[]> {
  const col = await collection<ApiCallLogDoc>(COLLECTIONS.apiCallLogs);
  const docs = await col
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toDomain);
}
