import { expect, test } from '@playwright/test';

const apiBase = process.env.E2E_API_BASE || 'http://localhost:5000';

type AuthBundle = {
  email: string;
  phone: string;
  password: string;
  token: string;
  userId: string;
};

async function registerUser(request: any, prefix: string): Promise<AuthBundle> {
  const seed = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
  const email = `${prefix}_${seed}@example.com`;
  const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
  const password = 'Password123!';

  const registerRes = await request.post(`${apiBase}/api/auth/register`, {
    data: {
      fullName: `QA ${prefix}`,
      email,
      phone,
      password,
    },
  });
  expect(registerRes.ok()).toBeTruthy();
  const registerJson = await registerRes.json();

  return {
    email,
    phone,
    password,
    token: registerJson.token,
    userId: registerJson.user.id,
  };
}

async function authPost(request: any, path: string, token: string, data: Record<string, any>) {
  return request.post(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
}

async function authGet(request: any, path: string, token: string) {
  return request.get(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test.describe('Backend scenario matrix', () => {
  test.skip(!process.env.E2E_RUN_BACKEND_FLOW, 'Set E2E_RUN_BACKEND_FLOW=1 to run backend scenario matrix.');

  test('health endpoint responds', async ({ request }) => {
    const res = await request.get(`${apiBase}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBeTruthy();
  });

  test('password reset round-trip', async ({ request }) => {
    const user = await registerUser(request, 'reset');

    const forgotRes = await request.post(`${apiBase}/api/auth/forgot-password`, {
      data: { email: user.email },
    });
    expect(forgotRes.ok()).toBeTruthy();
    const forgotJson = await forgotRes.json();
    expect(Boolean(forgotJson.resetToken)).toBeTruthy();

    const newPassword = 'Password456!';
    const resetRes = await request.post(`${apiBase}/api/auth/reset-password`, {
      data: {
        token: forgotJson.resetToken,
        password: newPassword,
      },
    });
    expect(resetRes.ok()).toBeTruthy();

    const loginRes = await request.post(`${apiBase}/api/auth/login`, {
      data: {
        email: user.email,
        password: newPassword,
      },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    expect(Boolean(loginJson.token)).toBeTruthy();
  });

  test('group lifecycle: create, join, and list', async ({ request }) => {
    const owner = await registerUser(request, 'owner');
    const member = await registerUser(request, 'member');

    const startDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const createRes = await authPost(request, '/api/groups', owner.token, {
      name: `QA Circle ${Date.now()}`,
      frequency: 'WEEKLY',
      contributionAmountKobo: 5000,
      maxMembers: 5,
      startDate,
    });
    expect(createRes.ok()).toBeTruthy();
    const group = await createRes.json();
    expect(Boolean(group.id)).toBeTruthy();
    expect(Boolean(group.invite_code)).toBeTruthy();

    const joinRes = await authPost(request, '/api/groups/join', member.token, {
      inviteCode: group.invite_code,
    });
    expect(joinRes.ok()).toBeTruthy();

    const ownerGroupsRes = await authGet(request, '/api/groups', owner.token);
    expect(ownerGroupsRes.ok()).toBeTruthy();
    const ownerGroups = await ownerGroupsRes.json();
    expect(ownerGroups.some((g: any) => g.id === group.id)).toBeTruthy();

    const memberGroupsRes = await authGet(request, '/api/groups', member.token);
    expect(memberGroupsRes.ok()).toBeTruthy();
    const memberGroups = await memberGroupsRes.json();
    expect(memberGroups.some((g: any) => g.id === group.id)).toBeTruthy();
  });

  test('payout request + role guard on approve', async ({ request }) => {
    const owner = await registerUser(request, 'payoutowner');
    const member = await registerUser(request, 'payoutmember');

    const startDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const createRes = await authPost(request, '/api/groups', owner.token, {
      name: `Payout Circle ${Date.now()}`,
      frequency: 'MONTHLY',
      contributionAmountKobo: 10000,
      maxMembers: 5,
      startDate,
    });
    expect(createRes.ok()).toBeTruthy();
    const group = await createRes.json();

    const joinRes = await authPost(request, '/api/groups/join', member.token, {
      inviteCode: group.invite_code,
    });
    expect(joinRes.ok()).toBeTruthy();

    const payoutReqRes = await authPost(request, '/api/payouts/request', owner.token, {
      groupId: group.id,
      recipientUserId: member.userId,
    });
    expect(payoutReqRes.ok()).toBeTruthy();
    const payout = await payoutReqRes.json();
    expect(payout.status).toBe('PENDING_REVIEW');

    const unauthorizedApproveRes = await authPost(request, `/api/payouts/${payout.id}/approve`, owner.token, {});
    expect(unauthorizedApproveRes.status()).toBe(403);
  });

  test('contribution endpoints return stable shape', async ({ request }) => {
    const user = await registerUser(request, 'contrib');

    const mineRes = await authGet(request, '/api/contributions/mine?limit=10', user.token);
    expect(mineRes.ok()).toBeTruthy();
    const mine = await mineRes.json();
    expect(Array.isArray(mine.contributions)).toBeTruthy();

    const summaryRes = await authGet(request, '/api/contributions/summary', user.token);
    expect(summaryRes.ok()).toBeTruthy();
    const summary = await summaryRes.json();
    expect(typeof summary.totalSavedKobo).toBe('number');
    expect(typeof summary.successfulContributions).toBe('number');
  });
});
