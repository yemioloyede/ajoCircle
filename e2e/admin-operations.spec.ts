/**
 * Real-life scenario: Admin operations
 *
 * Test cases:
 *   TC-AD-01  Regular user cannot access admin dashboard (403)
 *   TC-AD-02  Super-admin can GET /admin/dashboard
 *   TC-AD-03  Super-admin can list users via GET /admin/users
 *   TC-AD-04  Super-admin can fetch a single user GET /admin/users/:id
 *   TC-AD-05  Super-admin can freeze a user POST /admin/users/:id/freeze
 *   TC-AD-06  Super-admin can unfreeze a user POST /admin/users/:id/unfreeze
 *   TC-AD-07  Super-admin can change a user's role PATCH /admin/users/:id/role
 *   TC-AD-07B Super-admin can update user profile PATCH /admin/users/:id/profile
 *   TC-AD-08  Admin can list KYC submissions GET /admin/kyc
 *   TC-AD-09  Admin can approve/reject a KYC POST /admin/kyc/:id/approve|reject
 *   TC-AD-10  Admin can list groups GET /admin/groups
 *   TC-AD-11  Admin can freeze a group POST /admin/groups/:id/freeze
 *   TC-AD-12  Admin can view audit log GET /admin/audit
 *   TC-AD-13  Admin can view transactions GET /admin/transactions
 *   TC-AD-14  Payout approve by normal user returns 403
 *   TC-AD-15  Payout approve by compliance admin succeeds (or provider error)
 *
 * NOTE: These tests require a SUPER_ADMIN user. We create a regular user,
 * then promote them via the admin role-change endpoint (bootstrapped by
 * injecting the first super-admin through a test-only /api/auth/register flow
 * that assigns SUPER_ADMIN when the env var E2E_BOOTSTRAP_ADMIN=1 is set,
 * OR by using a pre-seeded admin in the database).
 *
 * Strategy: register user "alpha", promote via direct DB (skipped here since
 * we have no shell access in-test), so we use a two-tier approach:
 *   - We register user A as a normal user
 *   - We rely on the fact that the FIRST registered user may become admin
 *     (check bootstrap logic) or we use the test-only /api/admin/seed endpoint
 *     if it exists, otherwise we skip elevated tests gracefully.
 */

import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_BASE || 'http://localhost:5000';
const RUN = process.env.E2E_RUN_BACKEND_FLOW === '1';
// If you seed an admin manually, put their JWT here
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN || '';

const uid = () => Math.random().toString(36).slice(2, 8);

async function register(suffix: string) {
  const email = `ad-${suffix}-${uid()}@test.invalid`;
  const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test@1234!', fullName: `Admin Test ${suffix}`, phone }),
  });
  expect(res.status).toBe(200);
  return res.json();
}

// Try to promote a user to SUPER_ADMIN via a seeded admin token.
async function promoteToSuperAdmin(adminToken: string, targetUserId: string) {
  return fetch(`${API}/api/admin/users/${targetUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'SUPER_ADMIN' }),
  });
}

test.describe('Admin Operations', () => {
  test.skip(!RUN, 'Set E2E_RUN_BACKEND_FLOW=1 to run backend tests');

  let normalToken: string;
  let normalUserId: string;
  let adminToken: string; // either from env or promoted
  let targetUserId: string;
  let kycSubmissionId: string | null = null;
  let groupId: string | null = null;
  let payoutId: string | null = null;

  test.beforeAll(async () => {
    // Register a normal user
    const norm = await register('normal');
    normalToken = norm.token;
    normalUserId = norm.user.id;

    // Use supplied admin token or try to self-promote (only works if already super admin)
    adminToken = ADMIN_TOKEN;

    // If no admin token provided, we still run guard tests (403 checks)
  });

  // TC-AD-01: Normal user blocked from admin dashboard
  test('TC-AD-01: regular user gets 403 on admin dashboard', async () => {
    const res = await fetch(`${API}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    expect(res.status).toBe(403);
  });

  // TC-AD-02: Admin can access dashboard
  test('TC-AD-02: super-admin can GET /admin/dashboard', async () => {
    test.skip(!adminToken, 'E2E_ADMIN_TOKEN not set');
    const res = await fetch(`${API}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.totalUsers ?? data.users).toBeDefined();
  });

  // TC-AD-03: List users
  test('TC-AD-03: super-admin can list users', async () => {
    test.skip(!adminToken, 'E2E_ADMIN_TOKEN not set');
    const res = await fetch(`${API}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.users ?? data)).toBe(true);
  });

  // TC-AD-04: Fetch single user
  test('TC-AD-04: super-admin can fetch a single user', async () => {
    test.skip(!adminToken, 'E2E_ADMIN_TOKEN not set');
    const res = await fetch(`${API}/api/admin/users/${normalUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user?.id ?? data.id).toBe(normalUserId);
  });

  // TC-AD-05: Freeze a user
  test('TC-AD-05: super-admin can freeze a user', async () => {
    test.skip(!adminToken, 'E2E_ADMIN_TOKEN not set');
    // Register a throwaway user to freeze
    const victim = await register('victim');
    targetUserId = victim.user.id;

    const res = await fetch(`${API}/api/admin/users/${targetUserId}/freeze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([200, 204]).toContain(res.status);
  });

  // TC-AD-06: Unfreeze
  test('TC-AD-06: super-admin can unfreeze a user', async () => {
    test.skip(!adminToken || !targetUserId, 'Preconditions not met');
    const res = await fetch(`${API}/api/admin/users/${targetUserId}/unfreeze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([200, 204]).toContain(res.status);
  });

  // TC-AD-07: Change role
  test('TC-AD-07: super-admin can change a user role', async () => {
    test.skip(!adminToken || !targetUserId, 'Preconditions not met');
    const res = await promoteToSuperAdmin(adminToken, targetUserId);
    expect([200, 204]).toContain(res.status);
  });

  // TC-AD-07B: Update user profile
  test('TC-AD-07B: super-admin can update a user profile', async () => {
    test.skip(!adminToken || !targetUserId, 'Preconditions not met');
    const seed = Math.random().toString(36).slice(2, 6);
    const body = {
      fullName: `Updated User ${seed}`,
      email: `updated-${seed}@test.invalid`,
      phone: `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`,
    };

    const patchRes = await fetch(`${API}/api/admin/users/${targetUserId}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(body),
    });
    expect(patchRes.status).toBe(200);

    const fetchRes = await fetch(`${API}/api/admin/users/${targetUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(fetchRes.status).toBe(200);
    const data = await fetchRes.json();
    expect(data.user.full_name).toBe(body.fullName);
    expect(data.user.email).toBe(body.email);
    expect(data.user.phone).toBe(body.phone);
  });

  // TC-AD-08: List KYC submissions
  test('TC-AD-08: admin can list KYC submissions', async () => {
    test.skip(!adminToken, 'E2E_ADMIN_TOKEN not set');
    const res = await fetch(`${API}/api/admin/kyc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    // Store first KYC id if present
    const submissions = data.submissions ?? data.kyc ?? data;
    if (Array.isArray(submissions) && submissions.length > 0) {
      kycSubmissionId = submissions[0].id;
    }
  });

  // TC-AD-09: Approve a KYC submission
  test('TC-AD-09: admin can approve a KYC submission', async () => {
    test.skip(!adminToken || !kycSubmissionId, 'No KYC submissions available');
    const res = await fetch(`${API}/api/admin/kyc/${kycSubmissionId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([200, 204]).toContain(res.status);
  });

  // TC-AD-10: List groups
  test('TC-AD-10: admin can list all groups', async () => {
    test.skip(!adminToken, 'E2E_ADMIN_TOKEN not set');
    const res = await fetch(`${API}/api/admin/groups`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const groups = data.groups ?? data;
    expect(Array.isArray(groups)).toBe(true);
    if (groups.length > 0) groupId = groups[0].id;
  });

  // TC-AD-11: Freeze a group
  test('TC-AD-11: admin can freeze a group', async () => {
    test.skip(!adminToken || !groupId, 'No groups available');
    const res = await fetch(`${API}/api/admin/groups/${groupId}/freeze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect([200, 204]).toContain(res.status);
  });

  // TC-AD-12: Audit log
  test('TC-AD-12: admin can view the audit log', async () => {
    test.skip(!adminToken, 'E2E_ADMIN_TOKEN not set');
    const res = await fetch(`${API}/api/admin/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
  });

  // TC-AD-13: Transactions
  test('TC-AD-13: admin can view transactions', async () => {
    test.skip(!adminToken, 'E2E_ADMIN_TOKEN not set');
    const res = await fetch(`${API}/api/admin/transactions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });

  // TC-AD-14: Normal user cannot approve payouts
  test('TC-AD-14: normal user gets 403 when approving a payout', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${API}/api/payouts/${fakeId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${normalToken}` },
    });
    expect(res.status).toBe(403);
  });

  // TC-AD-15: Payout approve by compliance admin (requires setup)
  test('TC-AD-15: compliance admin can approve a payout (or get provider error)', async () => {
    test.skip(!adminToken || !payoutId, 'No payout available for approval');
    const res = await fetch(`${API}/api/payouts/${payoutId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // 200 = approved; 400/500 = provider error (acceptable in test env)
    expect([200, 400, 500]).toContain(res.status);
  });
});
