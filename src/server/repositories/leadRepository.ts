import { ObjectId } from 'mongodb';
import { collection, COLLECTIONS } from '@/server/db/mongo';
import { REPORT_TIMEZONE, sinceDaysAgo, fillDailySeries } from '@/shared/lib/date';
import type { Lead, LeadSource, LeadStatus } from '@/entities/lead';
import type { LeadDoc } from './types';

function toDomain(doc: LeadDoc): Lead {
  return {
    id: doc._id!.toHexString(),
    name: doc.name,
    email: doc.email,
    company: doc.company,
    source: doc.source,
    referrerPostId: doc.referrerPostId?.toHexString() ?? null,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listRecentLeads(limit = 20): Promise<Lead[]> {
  const col = await collection<LeadDoc>(COLLECTIONS.leads);
  const docs = await col.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(toDomain);
}

export async function countLeadsByStatus(): Promise<Record<LeadStatus, number>> {
  const col = await collection<LeadDoc>(COLLECTIONS.leads);
  const rows = await col
    .aggregate<{ _id: LeadStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  const base: Record<LeadStatus, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    CONVERTED: 0,
    LOST: 0,
  };
  for (const r of rows) base[r._id] = r.count;
  return base;
}

export async function countLeadsBySource(): Promise<Array<{ source: LeadSource; count: number }>> {
  const col = await collection<LeadDoc>(COLLECTIONS.leads);
  const rows = await col
    .aggregate<{ _id: LeadSource; count: number }>([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  return rows.map((r) => ({ source: r._id, count: r.count }));
}

/** 최근 N일 일자별 신규 리드 수 */
export async function dailyLeadCounts(days: number): Promise<Array<{ date: string; count: number }>> {
  const col = await collection<LeadDoc>(COLLECTIONS.leads);

  const rows = await col
    .aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: sinceDaysAgo(days) } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: REPORT_TIMEZONE },
          },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  // 집계와 동일한 타임존 기준으로 키를 만들어야 오늘 데이터가 누락되지 않습니다.
  return fillDailySeries(rows, days);
}

export async function insertLeads(leads: Array<Omit<Lead, 'id'>>): Promise<number> {
  if (leads.length === 0) return 0;
  const col = await collection<LeadDoc>(COLLECTIONS.leads);
  const res = await col.insertMany(
    leads.map((l) => ({
      name: l.name,
      email: l.email,
      company: l.company,
      source: l.source,
      referrerPostId: l.referrerPostId ? new ObjectId(l.referrerPostId) : null,
      status: l.status,
      createdAt: new Date(l.createdAt),
    })),
  );
  return res.insertedCount;
}
