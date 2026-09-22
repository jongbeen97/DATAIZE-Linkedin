import { ObjectId } from 'mongodb';
import { collection, COLLECTIONS } from '@/server/db/mongo';
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
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const rows = await col
    .aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Seoul' } },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const map = new Map(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: map.get(key) ?? 0 };
  });
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
