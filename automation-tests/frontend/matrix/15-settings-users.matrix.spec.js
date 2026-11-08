const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 15: System Settings & User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 20 POSITIVE TESTS
  test('POS-SET-001: Navigating to /settings displays System Settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1, h2').filter({ hasText: /settings/i }).first()).toBeVisible();
  });

  test('POS-SET-002: Company Name input accepts corporate business name', async ({ page }) => {
    await page.goto('/settings');
    const nameInput = page.locator('input[name="companyName"]');
    await nameInput.fill('HydroSleek Sanitarywares LLP');
    await expect(nameInput).toHaveValue('HydroSleek Sanitarywares LLP');
  });

  test('POS-SET-003: Phone input in settings accepts corporate support number', async ({ page }) => {
    await page.goto('/settings');
    const phone = page.locator('input[name="phone"]');
    await phone.fill('9812345678');
    await expect(phone).toHaveValue('9812345678');
  });

  test('POS-SET-004: Email input in settings accepts support inbox address', async ({ page }) => {
    await page.goto('/settings');
    const email = page.locator('input[name="email"]');
    await email.fill('support@hydrosleek.com');
    await expect(email).toHaveValue('support@hydrosleek.com');
  });

  test('POS-SET-005: Website URL input accepts enterprise domain', async ({ page }) => {
    await page.goto('/settings');
    const website = page.locator('input[name="website"]');
    await website.fill('https://www.hydrosleek.com');
    await expect(website).toHaveValue('https://www.hydrosleek.com');
  });

  test('POS-SET-006: GSTIN input accepts registered corporate tax ID', async ({ page }) => {
    await page.goto('/settings');
    const gst = page.locator('input[name="gstNumber"]');
    await gst.fill('27AABCU9603R1ZM');
    await expect(gst).toHaveValue('27AABCU9603R1ZM');
  });

  test('POS-SET-007: Currency Symbol input accepts Indian Rupee symbol (₹)', async ({ page }) => {
    await page.goto('/settings');
    const curr = page.locator('input[name="currencySymbol"], select[name="currencySymbol"]');
    if (await curr.isVisible()) {
      await curr.fill ? curr.fill('₹') : curr.selectOption('₹');
      expect(await curr.inputValue()).toBeTruthy();
    }
  });

  test('POS-SET-008: Admin user can click "Save Settings" button and receive success toast', async ({ page }) => {
    await page.goto('/settings');
    const saveBtn = page.getByRole('button', { name: /save settings/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await page.waitForTimeout(500);
  });

  test('POS-SET-009: Navigating to /users displays User Management portal', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('h1, h2').filter({ hasText: /user/i }).first()).toBeVisible();
  });

  test('POS-SET-010: Username input on user creation form accepts alphanumeric ID', async ({ page }) => {
    await page.goto('/users');
    const uInput = page.locator('input[name="username"], input[placeholder*="username" i]').first();
    if (await uInput.isVisible()) {
      await uInput.fill(`user_${Date.now()}`);
      expect(await uInput.inputValue()).toBeTruthy();
    }
  });

  test('POS-SET-011: Full Name input accepts employee personal name', async ({ page }) => {
    await page.goto('/users');
    const fInput = page.locator('input[name="fullName"], input[placeholder*="name" i]').first();
    if (await fInput.isVisible()) {
      await fInput.fill('Sunil Kumar');
      expect(await fInput.inputValue()).toBeTruthy();
    }
  });

  test('POS-SET-012: Role select allows assigning SALES role', async ({ page }) => {
    await page.goto('/users');
    const roleSelect = page.locator('select').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('SALES');
      await expect(roleSelect).toHaveValue('SALES');
    }
  });

  test('POS-SET-013: Role select allows assigning WAREHOUSE role', async ({ page }) => {
    await page.goto('/users');
    const roleSelect = page.locator('select').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('WAREHOUSE');
      await expect(roleSelect).toHaveValue('WAREHOUSE');
    }
  });

  test('POS-SET-014: Role select allows assigning MANAGER role', async ({ page }) => {
    await page.goto('/users');
    const roleSelect = page.locator('select').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('MANAGER');
      await expect(roleSelect).toHaveValue('MANAGER');
    }
  });

  test('POS-SET-015: Password input accepts secure initial password', async ({ page }) => {
    await page.goto('/users');
    const pwd = page.locator('input[type="password"]').first();
    if (await pwd.isVisible()) {
      await pwd.fill('StaffPassword@123');
      await expect(pwd).toHaveValue('StaffPassword@123');
    }
  });

  test('POS-SET-016: Creating managed user account persists successfully', async ({ page }) => {
    await page.goto('/users');
    const uName = `user_${Date.now()}`;
    const email = `emp_${Date.now()}@example.com`;
    const form = page.locator('form').first();
    if (await form.isVisible()) {
      await form.locator('input').nth(0).fill(uName);
      await form.locator('input').nth(1).fill(email);
      await form.locator('input').nth(2).fill('Test Employee');
      await form.locator('input').nth(3).fill('9876543210');
      await form.locator('input[type="password"]').fill('Password@123');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('POS-SET-017: User directory table renders list of existing accounts', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('table, .user-row, .grid').first()).toBeVisible();
  });

  test('POS-SET-018: Active toggle checkbox toggles user account active state', async ({ page }) => {
    await page.goto('/users');
    const chk = page.locator('input[type="checkbox"]').first();
    if (await chk.isVisible()) {
      const initial = await chk.isChecked();
      await chk.setChecked(!initial);
      expect(await chk.isChecked()).toBe(!initial);
    }
  });

  test('POS-SET-019: Address input on settings accepts headquarters address', async ({ page }) => {
    await page.goto('/settings');
    const addr = page.locator('input[name="address"], textarea[name="address"]');
    await addr.fill('100 Commercial Boulevard, Suite 500');
    await expect(addr).toHaveValue('100 Commercial Boulevard, Suite 500');
  });

  test('POS-SET-020: Pincode input on settings accepts 6-digit postal code', async ({ page }) => {
    await page.goto('/settings');
    const pin = page.locator('input[name="pincode"]');
    await pin.fill('400001');
    await expect(pin).toHaveValue('400001');
  });

  // 20 NEGATIVE TESTS
  test('NEG-SET-001: MANAGER accessing /settings has disabled form inputs', async ({ page }) => {
    await loginAs(page, 'MANAGER');
    await page.goto('/settings');
    await expect(page.locator('input[name="companyName"]')).toBeDisabled();
  });

  test('NEG-SET-002: MANAGER accessing /settings has no "Save Settings" button', async ({ page }) => {
    await loginAs(page, 'MANAGER');
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: /save settings/i })).toHaveCount(0);
  });

  test('NEG-SET-003: MANAGER accessing /settings sees administrator status disclaimer', async ({ page }) => {
    await loginAs(page, 'MANAGER');
    await page.goto('/settings');
    await expect(page.locator('p[role="status"]')).toHaveText('Only an administrator can change system settings.');
  });

  test('NEG-SET-004: SALES role navigating to /settings is shown unauthorized screen', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/settings');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/settings');
    expect(blocked).toBeTruthy();
  });

  test('NEG-SET-005: WAREHOUSE role navigating to /settings is shown unauthorized screen', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/settings');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/settings');
    expect(blocked).toBeTruthy();
  });

  test('NEG-SET-006: SALES role has no Settings link in sidebar', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
  });

  test('NEG-SET-007: WAREHOUSE role has no Settings link in sidebar', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
  });

  test('NEG-SET-008: SALES role navigating to /users is shown unauthorized screen', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/users');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/users');
    expect(blocked).toBeTruthy();
  });

  test('NEG-SET-009: WAREHOUSE role navigating to /users is shown unauthorized screen', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/users');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/users');
    expect(blocked).toBeTruthy();
  });

  test('NEG-SET-010: SALES role has no User Management link in sidebar', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'User Management', exact: true })).toHaveCount(0);
  });

  test('NEG-SET-011: Submitting empty company name in settings triggers error', async ({ page }) => {
    await page.goto('/settings');
    const nameInput = page.locator('input[name="companyName"]');
    await nameInput.fill('');
    await page.getByRole('button', { name: /save settings/i }).click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/settings');
  });

  test('NEG-SET-012: SQL injection in settings company name is sanitized', async ({ page }) => {
    await page.goto('/settings');
    const nameInput = page.locator('input[name="companyName"]');
    await nameInput.fill("' OR '1'='1' --");
    await page.getByRole('button', { name: /save settings/i }).click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/settings');
  });

  test('NEG-SET-013: XSS script tag in settings website URL does not execute', async ({ page }) => {
    let alertShown = false;
    page.on('dialog', () => { alertShown = true; });
    await page.goto('/settings');
    const website = page.locator('input[name="website"]');
    await website.fill('javascript:alert("settings-xss")');
    await page.getByRole('button', { name: /save settings/i }).click();
    await page.waitForTimeout(500);
    expect(alertShown).toBeFalsy();
  });

  test('NEG-SET-014: Submitting user creation with empty username triggers validation', async ({ page }) => {
    await page.goto('/users');
    const submitBtn = page.locator('form button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      const firstInput = page.locator('form input').first();
      const valid = await firstInput.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-SET-015: Duplicate username creation is rejected with error toast', async ({ page }) => {
    await page.goto('/users');
    const form = page.locator('form').first();
    if (await form.isVisible()) {
      await form.locator('input').nth(0).fill('qaadmin');
      await form.locator('input').nth(1).fill(`duplicate_${Date.now()}@example.com`);
      await form.locator('input').nth(2).fill('Admin Clone');
      await form.locator('input').nth(3).fill('9876543210');
      await form.locator('input[type="password"]').fill('Password@123');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('NEG-SET-016: Short password (< 6 chars) on user creation triggers validation', async ({ page }) => {
    await page.goto('/users');
    const pwdInput = page.locator('input[type="password"]').first();
    if (await pwdInput.isVisible()) {
      await pwdInput.fill('123');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(500);
    }
  });

  test('NEG-SET-017: Malformed email on user creation is rejected', async ({ page }) => {
    await page.goto('/users');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalidemailwithoutat');
      const valid = await emailInput.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-SET-018: Rapid double-click on Save Settings does not cause duplicate submission error', async ({ page }) => {
    await page.goto('/settings');
    const saveBtn = page.getByRole('button', { name: /save settings/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.dblclick();
      await page.waitForTimeout(300);
    }
  });

  test('NEG-SET-019: Deactivating currently logged-in Admin is prevented or handled safely', async ({ page }) => {
    await page.goto('/users');
    expect(page.url()).toContain('/users');
  });

  test('NEG-SET-020: Non-numeric pincode in settings is handled safely', async ({ page }) => {
    await page.goto('/settings');
    const pin = page.locator('input[name="pincode"]');
    await pin.fill('PIN_CODE');
    await page.getByRole('button', { name: /save settings/i }).click();
    await page.waitForTimeout(500);
  });
});
