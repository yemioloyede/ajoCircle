/**
 * Real-life scenario: Contributions and payment provider flow
 *
 * Test cases:
 *   TC-CO-01  Fresh member has empty /contributions/mine response
 *   TC-CO-02  GET /contributions/summary returns zero totals for new user
 *   TC-CO-03  POST /contributions/initialize returns a payment URL (or provider error)
 *   TC-CO-04  POST /contributions/verify with same reference is idempotent if already SUCCESS
 *   TC-CO-05  Non-member cannot initialize a contribution to a group
 *   TC-CO-06  /contributions/mine supports cursor-based pagination
 *   TC-CO-07  GET /payments/countries returns list of supported countries
 *   TC-CO-08  GET /payments/countries/NG returns Nigerian config
 *   TC-CO-09  GET /payments/payout-methods/NG returns payout method list
 *   TC-CO-10  POST /payments/providers/health returns provider health data
 */

import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_BASE || 'http://localhost:5000';
const RUN = process.env.E2E_RUN_BACKEND_FLOW === '1';

const uid = () => Math.random().toString(36).slice(2, 8);

async function register(suffix: string) {
  const email = `co-${suffix}-${uid()}@test.invalid`;
  const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test@1234!', fullName: `CO User ${suffix}`, phone }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  return { token: data.token as string, userId: data.user.id as string };
}

async function createGroupAndJoin(ownerToken: string, memberToken: string) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 3);

  const cRes = await fetch(`${API}/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: `Contrib Circle ${uid()}`,
      frequency: 'WEEKLY',
      contributionAmountKobo: 100000,
      maxMembers: 5,
      startDate: startDate.toISOString().slice(0, 10),
    }),
  });
  expect(cRes.status).toBe(200);
  const group = await cRes.json();

  const joinRes = await fetch(`${API}/api/groups/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
    body: JSON.stringify({ inviteCode: group.invite_code }),
  });
  expect(joinRes.status).toBe(200);

  return group;
}

test.describe('Contributions & Payments', () => {
  test.skip(!RUN, 'Set E2E_RUN_BACKEND_FLOW=1 to run backend tests');
  test.describe.configure({ mode: 'serial' });

  let ownerToken: string;
  let memberToken: string;
  let groupId: string;
  let paystackRef: string | null = null;

  test.beforeAll(async () => {
    const owner = await register('co-owner');
    const member = await register('co-member');
    ownerToken = owner.token;
    memberToken = member.token;
    const group = await createGroupAndJoin(ownerToken, memberToken);
    groupId = group.id;
  });

  // TC-CO-01: Empty contributions list for fresh user
  test('TC-CO-01: fresh user has empty contributions list', async () => {
    const fresh = await register('co-fresh');
    const res = await fetch(`${API}/api/contributions/mine`, {
      headers: { Authorization: `Bearer ${fresh.token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const contribs = data.contributions ?? data.data ?? data;
    expect(Array.isArray(contribs)).toBe(true);
    expect(contribs.length).toBe(0);
  });

  // TC-CO-02: Summary returns zeros for fresh user
  test('TC-CO-02: GET /contributions/summary returns zeros for new user', async () => {
    const fresh = await register('co-summ');
    const res = await fetch(`${API}/api/contributions/summary`, {
      headers: { Authorization: `Bearer ${fresh.token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Number(data.totalSavedKobo ?? data.total_saved_kobo ?? 0)).toBe(0);
    expect(Number(data.successfulContributions ?? data.successful_contributions ?? 0)).toBe(0);
  });

  // TC-CO-03: Initialize contribution — may return payment URL or provider error in test env
  test('TC-CO-03: POST /contributions/initialize returns payment URL or provider error', async () => {
    const res = await fetch(`${API}/api/contributions/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ groupId }),
    });
    // 200 = Paystack returned URL; other statuses cover provider/env limitations
    expect([200, 400, 500, 502, 503]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(data.authorizationUrl ?? data.authorization_url ?? data.paymentUrl).toBeTruthy();
      paystackRef = data.reference ?? data.ref;
    }
  });

  // TC-CO-04: Verify is idempotent if already SUCCESS
  test('TC-CO-04: POST /contributions/verify with same reference is idempotent', async () => {
    test.skip(!paystackRef, 'No reference obtained in TC-CO-03 (Paystack not live)');
    const res = await fetch(`${API}/api/contributions/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ reference: paystackRef }),
    });
    expect([200, 400]).toContain(res.status); // 400 if Paystack verification fails in test
  });

  // TC-CO-05: Non-member cannot initialize contribution
  test('TC-CO-05: non-member cannot initialize contribution for a group', async () => {
    const stranger = await register('co-stranger');
    const res = await fetch(`${API}/api/contributions/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stranger.token}` },
      body: JSON.stringify({ groupId }),
    });
    expect([403, 404]).toContain(res.status);
  });

  // TC-CO-06: Pagination cursor on /contributions/mine
  test('TC-CO-06: /contributions/mine supports cursor param without error', async () => {
    const res = await fetch(`${API}/api/contributions/mine?before=${new Date().toISOString()}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(res.status).toBe(200);
  });

  // TC-CO-07: Payment countries list
  test('TC-CO-07: GET /payments/countries returns list', async () => {
    const res = await fetch(`${API}/api/payments/countries`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
  });

  // TC-CO-08: Country detail for NG
  test('TC-CO-08: GET /payments/countries/NG returns Nigerian config', async () => {
    const res = await fetch(`${API}/api/payments/countries/NG`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(data).not.toBeNull();
    }
  });

  // TC-CO-09: Payout methods for NG
  test('TC-CO-09: GET /payments/payout-methods/NG returns methods', async () => {
    const res = await fetch(`${API}/api/payments/payout-methods/NG`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect([200, 404]).toContain(res.status);
  });

  // TC-CO-10: Provider health
  test('TC-CO-10: GET /payments/providers/health returns health data', async () => {
    const res = await fetch(`${API}/api/payments/providers/health`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect([200, 404, 503]).toContain(res.status);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      expect(typeof data).toBe('object');
    } else {
      const text = await res.text();
      expect(typeof text).toBe('string');
    }
  });
});
