import { env } from '../config/env';

const base = 'https://api.flutterwave.com/v3';

async function fw(path: string, method = 'GET', body?: any) {
  if (!env.flutterwaveSecretKey) throw new Error('Missing FLUTTERWAVE_SECRET_KEY');
  const r = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${env.flutterwaveSecretKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.status || r.status !== 'success') throw new Error(j.message || 'Flutterwave error');
  return j.data;
}

export function initializePayment(email: string, amount: number, currency: string, reference: string, metadata: any) {
  return fw('/payments', 'POST', {
    tx_ref: reference,
    amount: (amount / 100).toFixed(2), // Flutterwave expects major unit
    currency,
    redirect_url: metadata.redirectUrl || env.appOrigin + '/payment/callback',
    customer: { email },
    meta: metadata,
  });
}

export function verifyTransaction(reference: string) {
  return fw(`/transactions/${reference}/verify`, 'GET');
}
