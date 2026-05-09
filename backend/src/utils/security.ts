import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);
export const signToken = (payload: object) => jwt.sign(payload, env.jwtSecret, { expiresIn: '12h' });
export const verifyToken = (token: string) => jwt.verify(token, env.jwtSecret) as any;
export const nairaToKobo = (amount: number) => Math.round(amount * 100);

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;

function getKey(): Buffer {
  if (env.encryptionKey) {
    const k = Buffer.from(env.encryptionKey, 'hex');
    if (k.length === KEY_LEN) return k;
  }
  // Dev fallback: deterministic zero key (not for production)
  return Buffer.alloc(KEY_LEN, 0);
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: Buffer.concat([enc, tag]).toString('hex'),
    iv: iv.toString('hex'),
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const ivBuf = Buffer.from(iv, 'hex');
  const data = Buffer.from(encrypted, 'hex');
  const tag = data.slice(-16);
  const enc = data.slice(0, -16);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), ivBuf);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
