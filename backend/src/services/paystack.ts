import crypto from 'crypto';
import { env } from '../config/env';

const base = 'https://api.paystack.co';

async function ps(path: string, method = 'GET', body?: any) {
  if (!env.paystackSecretKey) throw new Error('Missing PAYSTACK_SECRET_KEY');
  const r = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${env.paystackSecretKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok || !j.status) throw new Error(j.message || 'Paystack error');
  return j.data;
}

export function verifyPaystackSignature(raw: string, signature?: string) {
  if (!signature) return false;
  const hash = crypto.createHmac('sha512', env.paystackSecretKey).update(raw).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(signature, 'hex'));
}

export function initializePayment(email: string, amountKobo: number, reference: string, metadata: any) {
  return ps('/transaction/initialize', 'POST', { email, amount: amountKobo, reference, metadata, channels: ['card', 'bank', 'ussd', 'bank_transfer'] });
}

export function verifyTransaction(reference: string) {
  return ps(`/transaction/verify/${reference}`);
}

export function listBanks() {
  return ps('/bank?country=nigeria&per_page=100');
}

export function resolveBank(account_number: string, bank_code: string) {
  return ps(`/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`);
}

export function createTransferRecipient(name: string, account_number: string, bank_code: string) {
  return ps('/transferrecipient', 'POST', { type: 'nuban', name, account_number, bank_code, currency: 'NGN' });
}

export function initiateTransfer(amountKobo: number, recipient: string, reason: string, reference: string) {
  return ps('/transfer', 'POST', { source: 'balance', amount: amountKobo, recipient, reason, reference });
}
