/**
 * Real-life scenario: Notifications and Ledger
 *
 * Test cases:
 *   TC-NL-01  GET /notifications returns array (may be empty for new user)
 *   TC-NL-02  PATCH /notifications/read-all returns 200
 *   TC-NL-03  Unauthenticated GET /notifications returns 401
 *   TC-NL-04  GET /ledger/me returns array for authenticated user
 *   TC-NL-05  Unauthenticated GET /ledger/me returns 401
 *   TC-NL-06  After group join, a notification may be present
 *   TC-NL-07  PATCH /notifications/:id/read marks a specific notification read
 */

import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_BASE || 'http://localhost:5000';
const RUN = process.env.E2E_RUN_BACKEND_FLOW === '1';

const uid = () => Math.random().toString(36).slice(2, 8);

async function register(suffix: string) {
  const email = `nl-${suffix}-${uid()}@test.invalid`;
  const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test@1234!', fullName: `NL User ${suffix}`, phone }),
  });
  expect(res.status).toBe(200);
  return res.json();
}

test.describe('Notifications & Ledger', () => {
  test.skip(!RUN, 'Set E2E_RUN_BACKEND_FLOW=1 to run backend tests');
  test.describe.configure({ mode: 'serial' });

  let token: string;
  let userId: string;
  let notifId: string | null = null;

  test.beforeAll(async () => {
    const user = await register('nl-user');
    token = user.token;
    userId = user.user.id;
  });

  // TC-NL-01: Notifications list (may be empty)
  test('TC-NL-01: GET /notifications returns array for authenticated user', async () => {
    const res = await fetch(`${API}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const notifs = data.notifications ?? data;
    expect(Array.isArray(notifs)).toBe(true);
    if (notifs.length > 0) notifId = notifs[0].id;
  });

  // TC-NL-02: Mark all read
  test('TC-NL-02: PATCH /notifications/read-all returns 200', async () => {
    const res = await fetch(`${API}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(res.status);
  });

  // TC-NL-03: Unauthenticated blocked
  test('TC-NL-03: unauthenticated GET /notifications returns 401', async () => {
    const res = await fetch(`${API}/api/notifications`);
    expect(res.status).toBe(401);
  });

  // TC-NL-04: Ledger entries
  test('TC-NL-04: GET /ledger/me returns array', async () => {
    const res = await fetch(`${API}/api/ledger/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const entries = data.entries ?? data.ledger ?? data;
    expect(Array.isArray(entries)).toBe(true);
  });

  // TC-NL-05: Unauthenticated ledger blocked
  test('TC-NL-05: unauthenticated GET /ledger/me returns 401', async () => {
    const res = await fetch(`${API}/api/ledger/me`);
    expect(res.status).toBe(401);
  });

  // TC-NL-06: After joining a group, check for notification
  test('TC-NL-06: group join may generate a notification', async () => {
    // Create a group as a second user then join with our user
    const owner = await register('nl-owner');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 3);

    const cRes = await fetch(`${API}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${owner.token}` },
      body: JSON.stringify({
        name: `NL Circle ${uid()}`,
        frequency: 'WEEKLY',
        contributionAmountKobo: 100000,
        maxMembers: 5,
        startDate: startDate.toISOString().slice(0, 10),
      }),
    });
    const group = await cRes.json();

    await fetch(`${API}/api/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ inviteCode: group.invite_code }),
    });

    // Check notifications — may include a join event
    const res = await fetch(`${API}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const notifs = data.notifications ?? data;
    expect(Array.isArray(notifs)).toBe(true);
    // Capture first notif id if present
    if (notifs.length > 0 && !notifId) notifId = notifs[0].id;
  });

  // TC-NL-07: Mark specific notification read
  test('TC-NL-07: PATCH /notifications/:id/read marks it read', async () => {
    test.skip(!notifId, 'No notifications available');
    const res = await fetch(`${API}/api/notifications/${notifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(res.status);
  });
});
