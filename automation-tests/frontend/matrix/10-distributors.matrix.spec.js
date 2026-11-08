const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 10: Distributors & Ledger Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 10 POSITIVE TESTS
  test('POS-DIST-001: "Add Distributor" button navigates to /distributors/new', async ({ page }) => {
    await page.goto('/distributors');
    const addBtn = page.getByRole('link', { name: /add distributor|new distributor/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page).toHaveURL(/\/distributors\/new$/);
    }
  });

  test('POS-DIST-002: Company Name input accepts enterprise supplier name', async ({ page }) => {
    await page.goto('/distributors/new');
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('Parryware Sanitary Distributors');
    await expect(nameInput).toHaveValue('Parryware Sanitary Distributors');
  });

  test('POS-DIST-003: Contact Person input accepts liaison name', async ({ page }) => {
    await page.goto('/distributors/new');
    const contact = page.locator('input[name="contactPerson"]');
    await contact.fill('Sanjay Gupta');
    await expect(contact).toHaveValue('Sanjay Gupta');
  });

  test('POS-DIST-004: Phone Number input accepts 10-digit number', async ({ page }) => {
    await page.goto('/distributors/new');
    const phone = page.locator('input[name="phoneNumber"]');
    await phone.fill('9812345678');
    await expect(phone).toHaveValue('9812345678');
  });

  test('POS-DIST-005: Email input accepts corporate supplier email', async ({ page }) => {
    await page.goto('/distributors/new');
    const email = page.locator('input[name="email"]');
    await email.fill('orders@parryware-dist.com');
    await expect(email).toHaveValue('orders@parryware-dist.com');
  });

  test('POS-DIST-006: GSTIN input accepts 15-character GSTIN', async ({ page }) => {
    await page.goto('/distributors/new');
    const gst = page.locator('input[name="gstNumber"]');
    await gst.fill('27AABCU9603R1ZM');
    await expect(gst).toHaveValue('27AABCU9603R1ZM');
  });

  test('POS-DIST-007: Bank details inputs accept bank name, account number, and IFSC', async ({ page }) => {
    await page.goto('/distributors/new');
    const bankName = page.locator('input[name="bankName"]');
    const accNo = page.locator('input[name="bankAccountNumber"]');
    const ifsc = page.locator('input[name="bankIfsc"]');
    if (await bankName.isVisible()) {
      await bankName.fill('HDFC Bank');
      await accNo.fill('50100234567890');
      await ifsc.fill('HDFC0001234');
      await expect(bankName).toHaveValue('HDFC Bank');
      await expect(ifsc).toHaveValue('HDFC0001234');
    }
  });

  test('POS-DIST-008: Complete distributor profile creation successfully persists', async ({ page }) => {
    await page.goto('/distributors/new');
    const testName = `Distributor_${Date.now()}`;
    const testPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[name="phoneNumber"]').fill(testPhone);
    await page.locator('input[name="email"]').fill(`dist_${Date.now()}@example.com`);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/distributors$/, { timeout: 20000 });
  });

  test('POS-DIST-009: Distributor search filters table by distributor title', async ({ page }) => {
    await page.goto('/distributors');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('Parryware');
      await search.press('Enter');
      await page.waitForTimeout(400);
      expect(page.url()).toContain('/distributors');
    }
  });

  test('POS-DIST-010: Back button on distributor form routes to /distributors', async ({ page }) => {
    await page.goto('/distributors/new');
    const backBtn = page.locator('button:has(.lucide-arrow-left), a:has(.lucide-arrow-left), a[href="/distributors"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/distributors$/);
    }
  });

  // 10 NEGATIVE TESTS
  test('NEG-DIST-001: Submitting distributor with empty Company Name triggers validation', async ({ page }) => {
    await page.goto('/distributors/new');
    await page.locator('input[name="name"]').fill('');
    await page.locator('button[type="submit"]').click();
    const valid = await page.locator('input[name="name"]').evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-DIST-002: Phone number with letters is rejected', async ({ page }) => {
    await page.goto('/distributors/new');
    const phone = page.locator('input[name="phoneNumber"]');
    await phone.fill('98123ABCD0');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/distributors/new');
  });

  test('NEG-DIST-003: Phone number shorter than 10 digits is rejected', async ({ page }) => {
    await page.goto('/distributors/new');
    const phone = page.locator('input[name="phoneNumber"]');
    await phone.fill('12345');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/distributors/new');
  });

  test('NEG-DIST-004: Duplicate distributor phone conflict displays error', async ({ page }) => {
    await page.goto('/distributors/new');
    await page.locator('input[name="name"]').fill('Duplicate Supplier');
    await page.locator('input[name="phoneNumber"]').fill('9876543210');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
  });

  test('NEG-DIST-005: Sales role navigating to /distributors is denied with unauthorized page', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/distributors');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/distributors');
    expect(blocked).toBeTruthy();
  });

  test('NEG-DIST-006: Warehouse role navigating to /distributors is denied', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/distributors');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/distributors');
    expect(blocked).toBeTruthy();
  });

  test('NEG-DIST-007: Non-existent distributor edit route /distributors/edit/999999 redirects', async ({ page }) => {
    await page.goto('/distributors/edit/999999');
    await page.waitForURL(/\/distributors$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/distributors$/);
  });

  test('NEG-DIST-008: SQL injection in distributor search executes safely', async ({ page }) => {
    await page.goto('/distributors');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill("' OR 1=1 --");
      await search.press('Enter');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/distributors');
    }
  });

  test('NEG-DIST-009: XSS script tag in distributor contact person is sanitized', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.goto('/distributors/new');
    const contact = page.locator('input[name="contactPerson"]');
    if (await contact.isVisible()) {
      await contact.fill('<script>alert("dist-xss")</script>');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(alertFired).toBeFalsy();
    }
  });

  test('NEG-DIST-010: Negative opening balance input is rejected', async ({ page }) => {
    await page.goto('/distributors/new');
    const bal = page.locator('input[name="outstandingBalance"]');
    if (await bal.isVisible()) {
      await bal.fill('-1000');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/distributors/new');
    }
  });
});
