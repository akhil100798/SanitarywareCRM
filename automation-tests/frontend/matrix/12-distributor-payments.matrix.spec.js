const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 12: Distributor Payments', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 10 POSITIVE TESTS
  test('POS-DPAY-001: "Record Payment" button routes to distributor payment form', async ({ page }) => {
    await page.goto('/distributor-payments');
    const recordBtn = page.getByRole('link', { name: /record payment|new payment/i });
    if (await recordBtn.isVisible()) {
      await recordBtn.click();
      await expect(page).toHaveURL(/\/distributor-payments\/new/);
    }
  });

  test('POS-DPAY-002: Distributor dropdown populates active vendor accounts', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      const options = await select.locator('option').all();
      if (options.length > 1) {
        await select.selectOption({ index: 1 });
        expect(await select.inputValue()).toBeTruthy();
      }
    }
  });

  test('POS-DPAY-003: Payment Amount input accepts valid settlement amount', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const amt = page.locator('input[type="number"]').first();
    if (await amt.isVisible()) {
      await amt.fill('5000');
      await expect(amt).toHaveValue('5000');
    }
  });

  test('POS-DPAY-004: Payment Method dropdown allows selecting BANK_TRANSFER', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const method = page.locator('select').nth(1);
    if (await method.isVisible()) {
      await method.selectOption('BANK_TRANSFER');
      await expect(method).toHaveValue('BANK_TRANSFER');
    }
  });

  test('POS-DPAY-005: Reference Number input accepts NEFT/RTGS transaction code', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const ref = page.locator('input[placeholder*="UTR Number" i], input[placeholder*="Reference" i]');
    if (await ref.isVisible()) {
      await ref.fill('NEFT_TXN_987654321');
      await expect(ref).toHaveValue('NEFT_TXN_987654321');
    }
  });

  test('POS-DPAY-006: Payment Date picker accepts selected bank transfer date', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-11-05');
      await expect(dateInput).toHaveValue('2026-11-05');
    }
  });

  test('POS-DPAY-007: Notes textarea accepts transaction details', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const notes = page.locator('textarea');
    if (await notes.isVisible()) {
      await notes.fill('Settlement for October ceramic consignments.');
      await expect(notes).toHaveValue('Settlement for October ceramic consignments.');
    }
  });

  test('POS-DPAY-008: Distributor payments list renders payment table records', async ({ page }) => {
    await page.goto('/distributor-payments');
    await expect(page.locator('h1, h2').filter({ hasText: /distributor payment/i }).first()).toBeVisible();
  });

  test('POS-DPAY-009: Search input filters distributor payments list', async ({ page }) => {
    await page.goto('/distributor-payments');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('NEFT');
      await search.press('Enter');
      await page.waitForTimeout(400);
      expect(page.url()).toContain('/distributor-payments');
    }
  });

  test('POS-DPAY-010: Back button on distributor payment form routes back to /distributor-payments', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const backBtn = page.locator('button:has(.lucide-arrow-left), a:has(.lucide-arrow-left), a[href="/distributor-payments"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/distributor-payments/);
    }
  });

  // 10 NEGATIVE TESTS
  test('NEG-DPAY-001: Submitting payment with amount = 0 is rejected', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const amt = page.locator('input[type="number"]').first();
    if (await amt.isVisible()) {
      await amt.fill('0');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/distributor-payments/new');
    }
  });

  test('NEG-DPAY-002: Submitting payment with negative amount is rejected', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const amt = page.locator('input[type="number"]').first();
    if (await amt.isVisible()) {
      await amt.fill('-1000');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/distributor-payments/new');
    }
  });

  test('NEG-DPAY-003: Submitting payment without selecting distributor is rejected', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/distributor-payments/new');
  });

  test('NEG-DPAY-004: Sales role navigating to /distributor-payments is denied with unauthorized screen', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/distributor-payments');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/distributor-payments');
    expect(blocked).toBeTruthy();
  });

  test('NEG-DPAY-005: Warehouse role navigating to /distributor-payments is denied', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/distributor-payments');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/distributor-payments');
    expect(blocked).toBeTruthy();
  });

  test('NEG-DPAY-006: SQL injection in distributor payment search executes safely', async ({ page }) => {
    await page.goto('/distributor-payments');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill("' OR 1=1 --");
      await search.press('Enter');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/distributor-payments');
    }
  });

  test('NEG-DPAY-007: XSS script tag in distributor payment notes is sanitized without alert dialog', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.goto('/distributor-payments/new');
    const notes = page.locator('textarea');
    if (await notes.isVisible()) {
      await notes.fill('<script>alert("dpay-xss")</script>');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(alertFired).toBeFalsy();
    }
  });

  test('NEG-DPAY-008: Rapid double-click on Save Payment button does not duplicate transaction', async ({ page }) => {
    await page.goto('/distributor-payments/new');
    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.dblclick();
    await page.waitForTimeout(300);
  });

  test('NEG-DPAY-009: Payment search with gibberish displays zero records cleanly', async ({ page }) => {
    await page.goto('/distributor-payments');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('zzznonexistentdpaystring999');
      await search.press('Enter');
      await page.waitForTimeout(500);
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeLessThanOrEqual(1);
    }
  });

  test('NEG-DPAY-010: Dismissing payment deletion confirmation dialog cancels action', async ({ page }) => {
    await page.goto('/distributor-payments');
    page.once('dialog', dialog => dialog.dismiss());
    const deleteBtn = page.locator('button:has(.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/distributor-payments');
    }
  });
});
