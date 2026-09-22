import { ObjectId } from 'mongodb';
import { collection, COLLECTIONS } from '@/server/db/mongo';
import { encryptSecret, decryptSecret } from '@/server/crypto';
import type { User } from '@/entities/user';
import type { UserDoc, OAuthTokenDoc } from './types';

function toDomain(doc: UserDoc): User {
  return {
    id: doc._id!.toHexString(),
    linkedinSub: doc.linkedinSub,
    personUrn: doc.personUrn,
    name: doc.name,
    email: doc.email,
    avatarUrl: doc.avatarUrl,
    createdAt: doc.createdAt.toISOString(),
    lastLoginAt: doc.lastLoginAt.toISOString(),
  };
}

/** 로그인할 때마다 호출 — 없으면 생성, 있으면 프로필 갱신 (upsert) */
export async function upsertUserFromLinkedIn(input: {
  linkedinSub: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}): Promise<User> {
  const col = await collection<UserDoc>(COLLECTIONS.users);
  const now = new Date();

  const result = await col.findOneAndUpdate(
    { linkedinSub: input.linkedinSub },
    {
      $set: {
        personUrn: `urn:li:person:${input.linkedinSub}`,
        name: input.name,
        email: input.email,
        avatarUrl: input.avatarUrl,
        lastLoginAt: now,
      },
      $setOnInsert: { linkedinSub: input.linkedinSub, createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );

  return toDomain(result!);
}

export async function findUserById(userId: string): Promise<User | null> {
  const col = await collection<UserDoc>(COLLECTIONS.users);
  const doc = await col.findOne({ _id: new ObjectId(userId) });
  return doc ? toDomain(doc) : null;
}

/* ------------------------- OAuth 토큰 ------------------------- */

export async function saveAccessToken(input: {
  userId: string;
  accessToken: string;
  expiresInSec: number;
  scopes: string[];
}): Promise<void> {
  const col = await collection<OAuthTokenDoc>(COLLECTIONS.oauthTokens);
  await col.updateOne(
    { userId: new ObjectId(input.userId) },
    {
      $set: {
        // 평문이 DB 에 절대 남지 않도록 저장 직전에 암호화
        accessTokenEnc: encryptSecret(input.accessToken),
        expiresAt: new Date(Date.now() + input.expiresInSec * 1000),
        scopes: input.scopes,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export interface StoredToken {
  accessToken: string;
  expiresAt: Date;
  scopes: string[];
  isExpired: boolean;
}

export async function findAccessToken(userId: string): Promise<StoredToken | null> {
  const col = await collection<OAuthTokenDoc>(COLLECTIONS.oauthTokens);
  const doc = await col.findOne({ userId: new ObjectId(userId) });
  if (!doc) return null;

  return {
    accessToken: decryptSecret(doc.accessTokenEnc),
    expiresAt: doc.expiresAt,
    scopes: doc.scopes,
    // 만료 60초 전부터 만료로 간주 (호출 도중 만료되는 경계 상황 방지)
    isExpired: doc.expiresAt.getTime() - 60_000 < Date.now(),
  };
}
