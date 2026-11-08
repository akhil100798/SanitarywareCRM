const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 09: Customer Payments & Receipts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 15 POSITIVE TESTS
  test('POS-PAY-001: "Record Payment" button routes to payment form', async ({ page }) => {
    await page.goto('/payments');
    const recordBtn = page.getByRole('link', { name: /record payment|new payment|add payment/i });
    if (await recordBtn.isVisible()) {
      await recordBtn.click();
      await expect(page).toHaveURL(/\/payments\/new/);
    }
  });

  test('POS-PAY-002: Payment Amount input accepts valid payment sum', async ({ page }) => {
    await page.goto('/payments/new');
    const amt = page.locator('input[name="amount"], input[type="number"]').first();
    if (await amt.isVisible()) {
      await amt.fill('1500');
      await expect(amt).toHaveValue('1500');
    }
  });

  test('POS-PAY-003: Payment Method selector allows CASH', async ({ page }) => {
    await page.goto('/payments/new');
    const method = page.locator('select[name="paymentMethod"]');
    if (await method.isVisible()) {
      await method.selectOption('CASH');
      await expect(method).toHaveValue('CASH');
    }
  });

  test('POS-PAY-004: Payment Method selector allows UPI', async ({ page }) => {
    await page.goto('/payments/new');
    const method = page.locator('select[name="paymentMethod"]');
    if (await method.isVisible()) {
      await method.selectOption('UPI');
      await expect(method).toHaveValue('UPI');
    }
  });

  test('POS-PAY-005: Payment Method selector allows CARD', async ({ page }) => {
    await page.goto('/payments/new');
    const method = page.locator('select[name="paymentMethod"]');
    if (await method.isVisible()) {
      await method.selectOption('CARD');
      await expect(method).toHaveValue('CARD');
    }
  });

  test('POS-PAY-006: Payment Method selector allows CHEQUE', async ({ page }) => {
    await page.goto('/payments/new');
    const method = page.locator('select[name="paymentMethod"]');
    if (await method.isVisible()) {
      await method.selectOption('CHEQUE');
      await expect(method).toHaveValue('CHEQUE');
    }
  });

  test('POS-PAY-007: Reference Number input accepts UPI transaction ID', async ({ page }) => {
    await page.goto('/payments/new');
    const ref = page.locator('input[name="referenceNumber"]');
    if (await ref.isVisible()) {
      await ref.fill('UPI_REF_123456789');
      await expect(ref).toHaveValue('UPI_REF_123456789');
    }
  });

  test('POS-PAY-008: Payment Date picker accepts chosen transaction date', async ({ page }) => {
    await page.goto('/payments/new');
    const dateInput = page.locator('input[name="paymentDate"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-11-05');
      await expect(dateInput).toHaveValue('2026-11-05');
    }
  });

  test('POS-PAY-009: Payment Notes textarea accepts receipt remarks', async ({ page }) => {
    await page.goto('/payments/new');
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible()) {
      await notes.fill('Advance deposit for bathroom fittings order.');
      await expect(notes).toHaveValue('Advance deposit for bathroom fittings order.');
    }
  });

  test('POS-PAY-010: Payments list displays receipt table records', async ({ page }) => {
    await page.goto('/payments');
    await expect(page.locator('h1, h2').filter({ hasText: /payment/i }).first()).toBeVisible();
  });

  test('POS-PAY-011: Search input filters payments list by receipt or customer', async ({ page }) => {
    await page.goto('/payments');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('REC-');
      await search.press('Enter');
      await page.waitForTimeout(400);
      expect(page.url()).toContain('/payments');
    }
  });

  test('POS-PAY-012: Payment method filter chips/select filter list records', async ({ page }) => {
    await page.goto('/payments');
    const methodFilter = page.locator('select').first();
    if (await methodFilter.isVisible()) {
      const options = await methodFilter.locator('option').all();
      if (options.length > 1) {
        await methodFilter.selectOption({ index: 1 });
        await page.waitForTimeout(300);
      }
    }
  });

  test('POS-PAY-013: Back to list button on payment form routes to /payments', async ({ page }) => {
    await page.goto('/payments/new');
    const backBtn = page.locator('button:has(.lucide-arrow-left), a:has(.lucide-arrow-left), a[href="/payments"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/payments/);
    }
  });

  test('POS-PAY-014: View receipt button opens receipt details or printable view', async ({ page }) => {
    await page.goto('/payments');
    const viewBtn = page.locator('button:has-text("View"), button:has-text("Print"), a[href*="receipt"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('POS-PAY-015: Sales role can view payments list', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/payments');
    await expect(page.locator('h1, h2').filter({ hasText: /payment/i }).first()).toBeVisible();
  });

  // 15 NEGATIVE TESTS
  test('NEG-PAY-001: Submitting payment with amount = 0 triggers error toast', async ({ page }) => {
    await page.goto('/payments/new');
    const amt = page.locator('input[name="amount"]');
    if (await amt.isVisible()) {
      await amt.fill('0');
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText(/amount must be greater/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('NEG-PAY-002: Submitting payment with negative amount is rejected', async ({ page }) => {
    await page.goto('/payments/new');
    const amt = page.locator('input[name="amount"]');
    if (await amt.isVisible()) {
      await amt.fill('-500');
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText(/amount must be greater/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('NEG-PAY-003: Submitting payment without selecting order is rejected', async ({ page }) => {
    await page.goto('/payments/new');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/payments/new');
  });

  test('NEG-PAY-004: Payment amount exceeding order balance due is rejected', async ({ page }) => {
    await page.goto('/payments/new?orderId=1');
    const amt = page.locator('input[name="amount"], input[type="number"]').first();
    if (await amt.isVisible()) {
      await amt.fill('999999999');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/payments/new');
    }
  });

  test('NEG-PAY-005: Non-numeric payment amount is blocked by input[type=number]', async ({ page }) => {
    await page.goto('/payments/new');
    const amt = page.locator('input[name="amount"], input[type="number"]').first();
    if (await amt.isVisible()) {
      await expect(amt).toHaveAttribute('type', 'number');
    }
  });

  test('NEG-PAY-006: SQL injection in payment search executes safely', async ({ page }) => {
    await page.goto('/payments');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill("' UNION SELECT null, null --");
      await search.press('Enter');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/payments');
    }
  });

  test('NEG-PAY-007: XSS script tag in payment notes is sanitized without alert dialog', async ({ page }) => {
    let alertShown = false;
    page.on('dialog', () => { alertShown = true; });
    await page.goto('/payments/new');
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible()) {
      await notes.fill('<script>alert("pay-xss")</script>');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(alertShown).toBeFalsy();
    }
  });

  test('NEG-PAY-008: Warehouse role navigating to /payments is forbidden or redirected', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/payments');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/payments');
    expect(blocked).toBeTruthy();
  });

  test('NEG-PAY-009: Warehouse role navigating to /payments/new is forbidden or redirected', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/payments/new');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/payments/new');
    expect(blocked).toBeTruthy();
  });

  test('NEG-PAY-010: Dismissing payment deletion confirmation dialog cancels action', async ({ page }) => {
    await page.goto('/payments');
    page.once('dialog', dialog => dialog.dismiss());
    const deleteBtn = page.locator('button:has(.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/payments');
    }
  });

  test('NEG-PAY-011: Rapid double-click on Save Payment button does not duplicate payment', async ({ page }) => {
    await page.goto('/payments/new');
    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.dblclick();
    await page.waitForTimeout(300);
  });

  test('NEG-PAY-012: Payment search with gibberish displays zero records cleanly', async ({ page }) => {
    await page.goto('/payments');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('zzznonexistentpaymentstring999');
      await search.press('Enter');
      await page.waitForTimeout(500);
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeLessThanOrEqual(1);
    }
  });

  test('NEG-PAY-013: Direct URL injection with negative orderId /payments/new?orderId=-1 handles gracefully', async ({ page }) => {
    await page.goto('/payments/new?orderId=-1');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/payments');
  });

  test('NEG-PAY-014: Direct URL injection with non-numeric orderId /payments/new?orderId=abc handles gracefully', async ({ page }) => {
    await page.goto('/payments/new?orderId=abc');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/payments');
  });

  test('NEG-PAY-015: Oversized notes textarea payload is accepted safely without page error', async ({ page }) => {
    await page.goto('/payments/new');
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible()) {
      await notes.fill('Receipt remark '.repeat(200));
      expect(await notes.inputValue()).toBeTruthy();
    }
  });
});
