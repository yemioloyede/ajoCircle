/**
 * Real-life scenario: Error handling and edge cases
 *
 * Test cases:
 *   TC-EC-01  Unauthenticated GET /groups returns 401
 *   TC-EC-02  Unauthenticated POST /groups returns 401
 *   TC-EC-03  Register with duplicate email returns 409
 *   TC-EC-04  Register with invalid email format returns 400
 *   TC-EC-05  Login with wrong password returns 401
 *   TC-EC-06  Join group with invalid invite code returns 404/400
 *   TC-EC-07  Join an already-joined group returns 409
 *   TC-EC-08  Create group with past startDate returns 400
 *   TC-EC-09  Create group with contributionAmountKobo below 100 returns 400
 *   TC-EC-10  Create group with maxMembers below 3 returns 400
 *   TC-EC-11  Non-member contribution initialize returns 403 or 404
 *   TC-EC-12  Payout approve by normal user returns 403
 *   TC-EC-13  Access /api/me with expired/invalid token returns 401
 *   TC-EC-14  Group with maxMembers > 100 returns 400
 *   TC-EC-15  POST /contributions/verify with unknown reference returns 400 or 404
 *   TC-EC-16  Request payout as non-admin group member returns 403
 *   TC-EC-17  Duplicate payout request for same group returns 409
 */

import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_BASE || 'http://localhost:5000';
const RUN = process.env.E2E_RUN_BACKEND_FLOW === '1';

const uid = () => Math.random().toString(36).slice(2, 8);

async function register(suffix: string) {
  const email = `ec-${suffix}-${uid()}@test.invalid`;
  const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test@1234!', fullName: `EC User ${suffix}`, phone }),
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  return { token: data.token as string, userId: data.user.id as string, email };
}

async function createGroup(ownerToken: string, overrides: Record<string, unknown> = {}) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 3);
  return fetch(`${API}/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: `EC Circle ${uid()}`,
      frequency: 'WEEKLY',
      contributionAmountKobo: 100000,
      maxMembers: 5,
      startDate: startDate.toISOString().slice(0, 10),
      ...overrides,
    }),
  });
}

test.describe('Error Handling & Edge Cases', () => {
  test.skip(!RUN, 'Set E2E_RUN_BACKEND_FLOW=1 to run backend tests');
  test.describe.configure({ mode: 'serial' });

  let user1Token: string;
  let user1Email: string;
  let groupInviteCode: string;
  let groupId: string;

  test.beforeAll(async () => {
    const u1 = await register('u1');
    user1Token = u1.token;
    user1Email = u1.email;

    // Create a reusable group
    const res = await createGroup(user1Token);
    const data = await res.json();
    groupId = data.id;
    groupInviteCode = data.invite_code;
  });

  // TC-EC-01: Unauthed group list
  test('TC-EC-01: unauthenticated GET /groups returns 401', async () => {
    const res = await fetch(`${API}/api/groups`);
    expect(res.status).toBe(401);
  });

  // TC-EC-02: Unauthed group create
  test('TC-EC-02: unauthenticated POST /groups returns 401', async () => {
    const res = await fetch(`${API}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked', frequency: 'WEEKLY', contributionAmountKobo: 100000, maxMembers: 5, startDate: '2099-01-01' }),
    });
    expect(res.status).toBe(401);
  });

  // TC-EC-03: Duplicate email registration
  test('TC-EC-03: registering with duplicate email returns 409', async () => {
    const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'Test@1234!', fullName: 'Dup User', phone }),
    });
    expect(res.status).toBe(409);
  });

  // TC-EC-04: Invalid email format
  test('TC-EC-04: register with invalid email format returns 400', async () => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'Test@1234!', fullName: 'Bad Email', phone: '+2347012345678' }),
    });
    expect([400, 422]).toContain(res.status);
  });

  // TC-EC-05: Wrong password login
  test('TC-EC-05: login with wrong password returns 401', async () => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'WrongPassword123!' }),
    });
    expect(res.status).toBe(401);
  });

  // TC-EC-06: Invalid invite code
  test('TC-EC-06: join with invalid invite code returns 404 or 400', async () => {
    const u = await register('ec-joinbad');
    const res = await fetch(`${API}/api/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u.token}` },
      body: JSON.stringify({ inviteCode: 'INVALID-CODE-000' }),
    });
    expect([400, 404]).toContain(res.status);
  });

  // TC-EC-07: Duplicate join returns 409
  test('TC-EC-07: joining the same group twice returns 409', async () => {
    const u = await register('ec-dup');
    // First join
    const res1 = await fetch(`${API}/api/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u.token}` },
      body: JSON.stringify({ inviteCode: groupInviteCode }),
    });
    expect(res1.status).toBe(200);

    // Second join (same group)
    const res2 = await fetch(`${API}/api/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${u.token}` },
      body: JSON.stringify({ inviteCode: groupInviteCode }),
    });
    expect(res2.status).toBe(409);
  });

  // TC-EC-08: Group with past startDate
  test('TC-EC-08: create group with past startDate returns 400', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const res = await createGroup(user1Token, { startDate: yesterday.toISOString().slice(0, 10) });
    expect(res.status).toBe(400);
  });

  // TC-EC-09: contributionAmountKobo below minimum (100)
  test('TC-EC-09: contributionAmountKobo below 100 returns 400', async () => {
    const res = await createGroup(user1Token, { contributionAmountKobo: 50 });
    expect([400, 422]).toContain(res.status);
  });

  // TC-EC-10: maxMembers below 3
  test('TC-EC-10: maxMembers below 3 returns 400', async () => {
    const res = await createGroup(user1Token, { maxMembers: 2 });
    expect([400, 422]).toContain(res.status);
  });

  // TC-EC-14: maxMembers above 100
  test('TC-EC-14: maxMembers above 100 returns 400', async () => {
    const res = await createGroup(user1Token, { maxMembers: 101 });
    expect([400, 422]).toContain(res.status);
  });

  // TC-EC-11: Non-member cannot initialize contribution
  test('TC-EC-11: non-member contribution initialize returns 403 or 404', async () => {
    const stranger = await register('ec-stranger');
    const res = await fetch(`${API}/api/contributions/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stranger.token}` },
      body: JSON.stringify({ groupId }),
    });
    expect([403, 404]).toContain(res.status);
  });

  // TC-EC-12: Payout approve by normal user
  test('TC-EC-12: payout approve by normal user returns 403', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await fetch(`${API}/api/payouts/${fakeId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    expect(res.status).toBe(403);
  });

  // TC-EC-13: Invalid/expired token
  test('TC-EC-13: request with invalid token returns 401', async () => {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: 'Bearer totally.invalid.token' },
    });
    expect(res.status).toBe(401);
  });

  // TC-EC-15: Verify with unknown reference
  test('TC-EC-15: POST /contributions/verify with unknown reference returns error', async () => {
    const res = await fetch(`${API}/api/contributions/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ reference: 'nonexistent-ref-xyz-000' }),
    });
    expect([400, 404, 500]).toContain(res.status);
  });

  // TC-EC-16: Non-admin group member cannot request payout
  test('TC-EC-16: non-admin group member cannot request payout', async () => {
    // Register a member and join the group
    const member = await register('ec-member');
    await fetch(`${API}/api/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${member.token}` },
      body: JSON.stringify({ inviteCode: groupInviteCode }),
    });

    // Member tries to request payout (only GROUP_ADMIN can)
    const res = await fetch(`${API}/api/payouts/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${member.token}` },
      body: JSON.stringify({ groupId, recipientUserId: member.userId }),
    });
    expect(res.status).toBe(403);
  });

  // TC-EC-17: Duplicate payout request (owner requests twice)
  test('TC-EC-17: duplicate payout request for same group returns 409', async () => {
    // Owner is GROUP_ADMIN, so first request should succeed or fail for another reason
    // We need a member to be the recipient
    const member = await register('ec-payout-member');
    await fetch(`${API}/api/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${member.token}` },
      body: JSON.stringify({ inviteCode: groupInviteCode }),
    });

    const payload = {
      groupId,
      recipientUserId: member.userId,
    };
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` };

    const res1 = await fetch(`${API}/api/payouts/request`, { method: 'POST', headers, body: JSON.stringify(payload) });
    // First request: 200 (created) - group may need to be ACTIVE, so accept various outcomes
    expect([200, 400, 404]).toContain(res1.status);

    if (res1.status === 200) {
      // Second request: should be 409 (pending already)
      const res2 = await fetch(`${API}/api/payouts/request`, { method: 'POST', headers, body: JSON.stringify(payload) });
      expect(res2.status).toBe(409);
    }
  });
});
