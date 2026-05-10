import { describe, it, expect } from 'vitest';
import {
  nairaToKobo,
  hashPassword,
  verifyPassword,
  signPasswordResetToken,
  verifyPasswordResetToken,
  encrypt,
  decrypt,
} from './security';

describe('security utils', () => {
  it('converts naira to kobo', () => {
    expect(nairaToKobo(123.45)).toBe(12345);
  });

  it('hashes and verifies password', async () => {
    const hash = await hashPassword('Ade3637!');
    expect(await verifyPassword('Ade3637!', hash)).toBe(true);
    expect(await verifyPassword('wrong-pass', hash)).toBe(false);
  });

  it('signs and verifies password reset token', () => {
    const token = signPasswordResetToken({ id: 'u1', email: 'user@example.com' });
    const payload = verifyPasswordResetToken(token);
    expect(payload.id).toBe('u1');
    expect(payload.email).toBe('user@example.com');
  });

  it('encrypts and decrypts values', () => {
    const value = '08030000000';
    const out = encrypt(value);
    const plain = decrypt(out.encrypted, out.iv);
    expect(plain).toBe(value);
  });
});
