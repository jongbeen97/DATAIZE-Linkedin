import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '@/shared/config/env';

/**
 * LinkedIn 액세스 토큰 암호화 (AES-256-GCM).
 *
 * 토큰은 사용자의 LinkedIn 계정으로 글을 쓸 수 있는 자격증명입니다.
 * DB 가 유출되어도 바로 악용되지 않도록 평문 저장을 금지하고,
 * 위·변조를 감지할 수 있는 GCM 모드(인증 암호화)를 사용합니다.
 *
 * 저장 포맷: {iv(hex)}:{authTag(hex)}:{ciphertext(hex)}
 */

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM 권장 96bit

function key(): Buffer {
  return Buffer.from(env().TOKEN_ENCRYPTION_KEY, 'hex');
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('암호화된 토큰 형식이 올바르지 않습니다.');
  }
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
