import { expect, test } from '@playwright/test';

async function goToAuthForm(page: any) {
  await page.goto('/login');
}

function loginButton(page: any) {
  return page.getByRole('button', { name: 'Login' });
}

function loginEmailInput(page: any) {
  return page.getByRole('textbox', { name: 'Email', exact: true });
}

function loginPasswordInput(page: any) {
  return page.getByPlaceholder('Password');
}

test.describe('Auth UI smoke', () => {
  test('shows sign-in by default', async ({ page }) => {
    await goToAuthForm(page);

    await expect(page.getByRole('heading', { name: /AjoCircle Admin v2\.1/i })).toBeVisible();
    await expect(page.getByText(/Sign in with your admin credentials/i)).toBeVisible();
    await expect(loginEmailInput(page)).toBeVisible();
    await expect(loginPasswordInput(page)).toBeVisible();
    await expect(loginButton(page)).toBeVisible();
  });

  test('shows validation error for empty login', async ({ page }) => {
    await goToAuthForm(page);

    await loginButton(page).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('shows access denied for non-admin login', async ({ page }) => {
    await goToAuthForm(page);

    const email = `qa_${Date.now()}@example.com`;
    const password = 'Password123!';
    const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:5000';

    const registerResponse = await page.request.post(`${apiBase}/api/auth/register`, {
      data: { email, password, fullName: 'QA User', phone },
    });
    expect(registerResponse.ok()).toBeTruthy();

    await loginEmailInput(page).fill(email);
    await loginPasswordInput(page).fill(password);
    await loginButton(page).click();

    await expect(page.getByText('Access denied: insufficient permissions')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('allows Enter key to submit the login form', async ({ page }) => {
    await goToAuthForm(page);

    await loginEmailInput(page).fill('bad@example.com');
    await loginPasswordInput(page).fill('badpassword');
    await loginPasswordInput(page).press('Enter');

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});

test.describe('Backend-dependent auth flows', () => {
  test.skip(!process.env.E2E_RUN_BACKEND_FLOW, 'Set E2E_RUN_BACKEND_FLOW=1 to run live backend flow tests.');

  test('register + login returns access denied for member account', async ({ page, request }) => {
    const email = `qa_${Date.now()}@example.com`;
    const password = 'Password123!';
    const phone = `0${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`;
    const apiBase = process.env.E2E_API_BASE || 'http://localhost:5000';

    await goToAuthForm(page);

    const registerResponse = await request.post(`${apiBase}/api/auth/register`, {
      data: { email, password, fullName: 'QA User', phone },
    });
    expect(registerResponse.ok()).toBeTruthy();

    await loginEmailInput(page).fill(email);
    await loginPasswordInput(page).fill(password);
    await loginButton(page).click();

    await expect(page.getByText('Access denied: insufficient permissions')).toBeVisible();
  });
});
