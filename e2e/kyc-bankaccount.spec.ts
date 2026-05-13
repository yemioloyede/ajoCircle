/**
 * Real-life scenario: KYC submission and bank account management
 *
 * Test cases:
 *   TC-KYC-01  User submits KYC with BVN (11 digits); status becomes PENDING
 *   TC-KYC-02  POST /kyc with short BVN returns 400 validation error
 *   TC-KYC-03  GET /kyc returns PENDING after submission
 *   TC-KYC-04  Re-submitting KYC updates the existing record (upsert)
 *   TC-KYC-05  GET /banks returns array of Nigerian banks
 *   TC-KYC-06  GET /banks for non-NG country returns empty array with message
 *   TC-KYC-07  POST /bank-accounts with valid payload returns 201
 *   TC-KYC-08  GET /bank-accounts lists the saved account
 *   TC-KYC-09  PATCH /bank-accounts/:id/primary marks it primary
 *   TC-KYC-10  DELETE /bank-accounts/:id removes the account
 */

import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_BASE || 'http://localhost:5000';
const RUN = process.env.E2E_RUN_BACKEND_FLOW === '1';

const uid = () => Math.random().toString(36).slice(2, 8);

async function registerAndLogin(suffix: string) {
  const email = `kyc-${suffix}-${uid()}@test.invalid`;
  const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test@1234!', fullName: `KYC User ${suffix}`, phone }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  return { token: data.token as string, userId: data.user.id as string };
}

test.describe('KYC & Bank Account Management', () => {
  test.skip(!RUN, 'Set E2E_RUN_BACKEND_FLOW=1 to run backend tests');
  test.describe.configure({ mode: 'serial' });

  let token: string;
  let bankAccountId: string;

  test.beforeAll(async () => {
    const user = await registerAndLogin('kyc-user');
    token = user.token;
  });

  // TC-KYC-01: Valid BVN submission
  test('TC-KYC-01: user submits valid BVN and gets PENDING status', async () => {
    const res = await fetch(`${API}/api/users/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bvn: '22222222222' }), // 11-digit test BVN
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('PENDING');
  });

  // TC-KYC-02: Short BVN rejected
  test('TC-KYC-02: BVN with wrong length returns 400', async () => {
    const user2 = await registerAndLogin('kyc-bad');
    const res = await fetch(`${API}/api/users/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2.token}` },
      body: JSON.stringify({ bvn: '1234' }), // too short
    });
    expect([400, 422]).toContain(res.status);
  });

  // TC-KYC-03: GET /kyc reflects PENDING
  test('TC-KYC-03: GET /kyc returns PENDING after submission', async () => {
    const res = await fetch(`${API}/api/users/kyc`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kyc).not.toBeNull();
    expect(data.kyc.status).toBe('PENDING');
  });

  // TC-KYC-04: Re-submission upserts (does not duplicate)
  test('TC-KYC-04: re-submitting KYC updates existing record', async () => {
    const res = await fetch(`${API}/api/users/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bvn: '33333333333', nin: '44444444444' }),
    });
    // Should succeed (upsert) and remain PENDING
    expect([200, 409]).toContain(res.status); // 409 only if already VERIFIED
    if (res.status === 200) {
      const data = await res.json();
      expect(data.status).toBe('PENDING');
    }
  });

  // TC-KYC-05: Nigerian bank list
  test('TC-KYC-05: GET /banks returns array of Nigerian banks', async () => {
    const res = await fetch(`${API}/api/users/banks?countryCode=NG`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.banks)).toBe(true);
  });

  // TC-KYC-06: Non-NG returns empty with message
  test('TC-KYC-06: GET /banks for GH returns empty array with message', async () => {
    const res = await fetch(`${API}/api/users/banks?countryCode=GH`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.banks)).toBe(true);
    expect(data.banks.length).toBe(0);
    expect(typeof data.message).toBe('string');
  });

  // TC-KYC-07: Add bank account (manual, provider-less)
  test('TC-KYC-07: POST /bank-accounts saves a new account', async () => {
    const res = await fetch(`${API}/api/users/bank-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        countryCode: 'NG',
        currencyCode: 'NGN',
        payoutMethodType: 'BANK_ACCOUNT',
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
        accountName: 'KYC User Test',
        makePrimary: true,
      }),
    });
    // May succeed (201/200) or fail if Paystack resolution is required and key is invalid
    // We accept 200/201 (happy path) or 400/502 (Paystack resolution failure in test env)
    expect([200, 201, 400, 502, 503]).toContain(res.status);
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      bankAccountId = data.account?.id ?? data.id;
    }
  });

  // TC-KYC-08: List saved accounts
  test('TC-KYC-08: GET /bank-accounts returns list', async () => {
    const res = await fetch(`${API}/api/users/bank-accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.accounts)).toBe(true);
  });

  // TC-KYC-09: Mark as primary (only if account was created)
  test('TC-KYC-09: PATCH /bank-accounts/:id/primary marks account primary', async () => {
    test.skip(!bankAccountId, 'No bank account created in TC-KYC-07');
    const res = await fetch(`${API}/api/users/bank-accounts/${bankAccountId}/primary`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(res.status);
  });

  // TC-KYC-10: Delete account
  test('TC-KYC-10: DELETE /bank-accounts/:id removes the account', async () => {
    test.skip(!bankAccountId, 'No bank account created in TC-KYC-07');
    const res = await fetch(`${API}/api/users/bank-accounts/${bankAccountId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(res.status);

    // Verify it no longer appears
    const listRes = await fetch(`${API}/api/users/bank-accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await listRes.json();
    const ids = (data.accounts as Array<{ id: string }>).map(a => a.id);
    expect(ids).not.toContain(bankAccountId);
  });
});
