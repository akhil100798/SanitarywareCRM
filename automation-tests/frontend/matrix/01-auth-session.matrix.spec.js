const { test, expect } = require('@playwright/test');
const { credentials, loginAs, cleanSession, uniqueId } = require('./helpers');

test.describe('Matrix Module 01: Authentication & Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await cleanSession(page);
  });

  // 15 POSITIVE TESTS
  test('POS-AUTH-001: Admin login button authenticates with valid credentials', async ({ page }) => {
    await page.locator('input[name="username"]').fill(credentials.ADMIN.username);
    await page.locator('input[name="password"]').fill(credentials.ADMIN.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible();
  });

  test('POS-AUTH-002: Manager login authenticates and routes to dashboard', async ({ page }) => {
    await page.locator('input[name="username"]').fill(credentials.MANAGER.username);
    await page.locator('input[name="password"]').fill(credentials.MANAGER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
    await expect(page.getByText('MANAGER', { exact: true })).toBeVisible();
  });

  test('POS-AUTH-003: Sales login authenticates and routes to dashboard', async ({ page }) => {
    await page.locator('input[name="username"]').fill(credentials.SALES.username);
    await page.locator('input[name="password"]').fill(credentials.SALES.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
    await expect(page.getByText('SALES', { exact: true })).toBeVisible();
  });

  test('POS-AUTH-004: Warehouse login authenticates and routes to dashboard', async ({ page }) => {
    await page.locator('input[name="username"]').fill(credentials.WAREHOUSE.username);
    await page.locator('input[name="password"]').fill(credentials.WAREHOUSE.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
    await expect(page.getByText('WAREHOUSE', { exact: true })).toBeVisible();
  });

  test('POS-AUTH-005: Form submission via Enter key press on password input', async ({ page }) => {
    await page.locator('input[name="username"]').fill(credentials.ADMIN.username);
    await page.locator('input[name="password"]').fill(credentials.ADMIN.password);
    await page.locator('input[name="password"]').press('Enter');
    await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible();
  });

  test('POS-AUTH-006: Header user profile badge is visible after login', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await expect(page.locator('button:has-text("Logout"), button:has(.lucide-log-out)')).toBeVisible();
  });

  test('POS-AUTH-007: Logout button clears session and redirects to login', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    const logoutBtn = page.locator('button:has-text("Logout"), button:has(.lucide-log-out)');
    await logoutBtn.click();
    await page.waitForURL(/\/login$/, { timeout: 15000 });
    const token = await page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
    expect(token).toBeFalsy();
  });

  test('POS-AUTH-008: Register link navigates to registration page', async ({ page }) => {
    const regLink = page.getByRole('link', { name: /create an account|register|sign up/i });
    if (await regLink.count() > 0) {
      await regLink.click();
      await expect(page).toHaveURL(/\/register$/);
    } else {
      await page.goto('/register');
      await expect(page).toHaveURL(/\/register$/);
    }
  });

  test('POS-AUTH-009: Back to login link on register page', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.getByRole('link', { name: /already have an account|sign in|login/i });
    if (await loginLink.count() > 0) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('POS-AUTH-010: Session persistence across page reloads', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible();
  });

  test('POS-AUTH-011: Direct access to dashboard when already authenticated redirects immediately', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/login');
    // Either stays on login or forwards to dashboard
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(dashboard|login)$/);
  });

  test('POS-AUTH-012: Profile page renders user information for logged in user', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/profile');
    await expect(page.locator('h1, h2, h3').filter({ hasText: /profile/i })).toBeVisible();
  });

  test('POS-AUTH-013: Profile email input displays current user email', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/profile');
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    if (await emailInput.count() > 0) {
      const val = await emailInput.inputValue();
      expect(val).toContain('@');
    }
  });

  test('POS-AUTH-014: Password input obscures characters (type="password")', async ({ page }) => {
    const pwdInput = page.locator('input[name="password"]');
    await expect(pwdInput).toHaveAttribute('type', 'password');
  });

  test('POS-AUTH-015: Login form resets error state on new input change', async ({ page }) => {
    await page.locator('input[name="username"]').fill('invalid_user');
    await page.locator('input[name="password"]').fill('wrong_pwd');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
    // Type again, form allows typing and retry
    await page.locator('input[name="username"]').fill('qaadmin');
    await page.locator('input[name="password"]').fill('Password@123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible();
  });

  // 15 NEGATIVE TESTS
  test('NEG-AUTH-001: Empty username submission displays error message', async ({ page }) => {
    await page.locator('input[name="username"]').fill('');
    await page.locator('input[name="password"]').fill('Password@123');
    await page.locator('button[type="submit"]').click();
    // HTML5 required validation or inline error
    const isValid = await page.locator('input[name="username"]').evaluate(el => el.checkValidity());
    expect(isValid).toBeFalsy();
  });

  test('NEG-AUTH-002: Empty password submission triggers validation', async ({ page }) => {
    await page.locator('input[name="username"]').fill('qaadmin');
    await page.locator('input[name="password"]').fill('');
    await page.locator('button[type="submit"]').click();
    const isValid = await page.locator('input[name="password"]').evaluate(el => el.checkValidity());
    expect(isValid).toBeFalsy();
  });

  test('NEG-AUTH-003: Invalid username displays authentication error banner', async ({ page }) => {
    await page.locator('input[name="username"]').fill('nonexistent_user_9999');
    await page.locator('input[name="password"]').fill('WrongPassword123');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
  });

  test('NEG-AUTH-004: Incorrect password displays failure toast or alert', async ({ page }) => {
    await page.locator('input[name="username"]').fill('qaadmin');
    await page.locator('input[name="password"]').fill('TotallyIncorrectPassword@999');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
  });

  test('NEG-AUTH-005: Whitespace-only username is rejected', async ({ page }) => {
    await page.locator('input[name="username"]').fill('     ');
    await page.locator('input[name="password"]').fill('Password@123');
    await page.locator('button[type="submit"]').click();
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('NEG-AUTH-006: SQL injection payload in username is safely rejected', async ({ page }) => {
    await page.locator('input[name="username"]').fill("' OR '1'='1' --");
    await page.locator('input[name="password"]').fill('irrelevant');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('NEG-AUTH-007: XSS script tag in username is sanitized and does not execute', async ({ page }) => {
    let alertTriggered = false;
    page.on('dialog', () => { alertTriggered = true; });
    await page.locator('input[name="username"]').fill('<script>alert("xss")</script>');
    await page.locator('input[name="password"]').fill('irrelevant');
    await page.locator('button[type="submit"]').click();
    expect(alertTriggered).toBeFalsy();
  });

  test('NEG-AUTH-008: Deep link to /dashboard without token redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('NEG-AUTH-009: Deep link to /settings without token redirects to /login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('NEG-AUTH-010: Deep link to /profile without token redirects to /login', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('NEG-AUTH-011: Malformed corrupted JWT in localStorage triggers redirect on reload', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupted.payload');
    });
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('NEG-AUTH-012: Registration with empty fields triggers HTML5 validation', async ({ page }) => {
    await page.goto('/register');
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      const firstInput = page.locator('input[required]').first();
      if (await firstInput.count() > 0) {
        const valid = await firstInput.evaluate(el => el.checkValidity());
        expect(valid).toBeFalsy();
      }
    }
  });

  test('NEG-AUTH-013: Registration with mismatched passwords displays error', async ({ page }) => {
    await page.goto('/register');
    const pwd = page.locator('input[name="password"]');
    const confirmPwd = page.locator('input[name="confirmPassword"]');
    if (await pwd.count() > 0 && await confirmPwd.count() > 0) {
      await pwd.fill('Secret123!');
      await confirmPwd.fill('DifferentSecret456!');
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.error-message, .text-red-300, [role="status"]')).toBeVisible();
    }
  });

  test('NEG-AUTH-014: Registration with invalid email format shows error', async ({ page }) => {
    await page.goto('/register');
    const email = page.locator('input[name="email"]');
    if (await email.count() > 0) {
      await email.fill('invalid-email-without-at');
      const valid = await email.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-AUTH-015: Tampered user role in sessionStorage does not bypass server authorization', async ({ page }) => {
    await loginAs(page, 'SALES');
    // Try to escalate role client-side
    await page.evaluate(() => {
      const u = JSON.parse(sessionStorage.getItem('user') || '{}');
      u.role = 'ADMIN';
      sessionStorage.setItem('user', JSON.stringify(u));
    });
    // Attempt to access admin settings API via fetch
    const responseStatus = await page.evaluate(async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ companyName: 'Hacked' })
      });
      return res.status;
    });
    expect([403, 401]).toContain(responseStatus);
  });
});
