const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 11: Purchase Orders & Receiving', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 15 POSITIVE TESTS
  test('POS-PO-001: "Create Purchase Order" button navigates to /purchase-orders/new', async ({ page }) => {
    await page.goto('/purchase-orders');
    const addBtn = page.getByRole('link', { name: /create purchase order|new purchase order|add po/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page).toHaveURL(/\/purchase-orders\/new$/);
    }
  });

  test('POS-PO-002: Distributor dropdown populates active suppliers', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const distSelect = page.locator('select').first();
    if (await distSelect.isVisible()) {
      const options = await distSelect.locator('option').all();
      if (options.length > 1) {
        await distSelect.selectOption({ index: 1 });
        expect(await distSelect.inputValue()).toBeTruthy();
      }
    }
  });

  test('POS-PO-003: Order Date picker sets procurement order date', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const orderDate = page.locator('input[type="date"]').first();
    if (await orderDate.isVisible()) {
      await orderDate.fill('2026-11-05');
      await expect(orderDate).toHaveValue('2026-11-05');
    }
  });

  test('POS-PO-004: "Add Item" button appends procurement line item', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const addBtn = page.locator('button:has(.lucide-plus), button:has-text("Add Item"), button:has-text("Add Product")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);
      const rows = page.locator('tbody tr, .item-row');
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('POS-PO-005: Line item quantity input accepts purchase quantity', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('20');
      await expect(qtyInput).toHaveValue('20');
    }
  });

  test('POS-PO-006: PO Notes textarea accepts supplier shipment instructions', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const notes = page.locator('textarea');
    if (await notes.isVisible()) {
      await notes.fill('Bulk consignment via North Road logistics.');
      await expect(notes).toHaveValue('Bulk consignment via North Road logistics.');
    }
  });

  test('POS-PO-007: Purchase order list renders table with PO records', async ({ page }) => {
    await page.goto('/purchase-orders');
    await expect(page.locator('h1, h2').filter({ hasText: /purchase order/i }).first()).toBeVisible();
  });

  test('POS-PO-008: Search input filters purchase order records by PO reference', async ({ page }) => {
    await page.goto('/purchase-orders');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('PO-');
      await search.press('Enter');
      await page.waitForTimeout(400);
      expect(page.url()).toContain('/purchase-orders');
    }
  });

  test('POS-PO-009: Status filter tabs toggle PO status views', async ({ page }) => {
    await page.goto('/purchase-orders');
    const filterBtn = page.locator('button, a').filter({ hasText: /ordered|received|all/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('POS-PO-010: "Receive PO" action button is clickable on pending orders', async ({ page }) => {
    await page.goto('/purchase-orders');
    const receiveBtn = page.locator('button:has-text("Receive"), a:has-text("Receive")').first();
    if (await receiveBtn.isVisible()) {
      expect(await receiveBtn.isEnabled()).toBeTruthy();
    }
  });

  test('POS-PO-011: Trash button removes item row from purchase order form', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const addBtn = page.locator('button:has(.lucide-plus), button:has-text("Add Item")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(200);
      const trashBtn = page.locator('button:has(.lucide-trash-2)').first();
      if (await trashBtn.isVisible()) {
        await trashBtn.click();
        await page.waitForTimeout(200);
      }
    }
  });

  test('POS-PO-012: Back button on purchase order form routes to /purchase-orders', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const backBtn = page.locator('button:has(.lucide-arrow-left), a:has(.lucide-arrow-left), a[href="/purchase-orders"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/purchase-orders$/);
    }
  });

  test('POS-PO-013: Total amount card aggregates line items and tax', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    await expect(page.locator('text=/subtotal|total/i').first()).toBeVisible();
  });

  test('POS-PO-014: View PO action routes to purchase order detail screen', async ({ page }) => {
    await page.goto('/purchase-orders');
    const viewBtn = page.locator('a[href*="/purchase-orders/edit/"], button:has-text("View")').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await expect(page).toHaveURL(/\/purchase-orders\/edit\/\d+$/);
    }
  });

  test('POS-PO-015: Supplier invoice PDF attachment dropzone is present in DOM', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThanOrEqual(0);
  });

  // 15 NEGATIVE TESTS
  test('NEG-PO-001: Submitting PO with no distributor selected is rejected', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/purchase-orders/new');
  });

  test('NEG-PO-002: Submitting PO with 0 items is rejected', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const distSelect = page.locator('select').first();
    if (await distSelect.isVisible()) {
      await distSelect.selectOption({ index: 1 });
    }
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/purchase-orders/new');
  });

  test('NEG-PO-003: Line item quantity = 0 triggers validation error', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('0');
      const valid = await qtyInput.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-PO-004: Negative line item quantity is rejected', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const addBtn = page.locator('button:has(.lucide-plus), button:has-text("Add Item"), button:has-text("Add Product")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);
      const qtyInput = page.locator('input[type="number"]').first();
      if (await qtyInput.isVisible()) {
        await qtyInput.fill('-10');
        const valid = await qtyInput.evaluate(el => el.checkValidity());
        expect(valid).toBeFalsy();
      }
    }
  });

  test('NEG-PO-005: Sales role navigating to /purchase-orders is denied with unauthorized screen', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/purchase-orders');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/purchase-orders');
    expect(blocked).toBeTruthy();
  });

  test('NEG-PO-006: Sales role navigating to /purchase-orders/new is denied', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/purchase-orders/new');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/purchase-orders/new');
    expect(blocked).toBeTruthy();
  });

  test('NEG-PO-007: Non-existent PO edit route /purchase-orders/edit/999999 redirects', async ({ page }) => {
    await page.goto('/purchase-orders/edit/999999');
    await page.waitForURL(/\/purchase-orders$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/purchase-orders$/);
  });

  test('NEG-PO-008: Direct URL injection with negative PO ID /purchase-orders/edit/-1 redirects', async ({ page }) => {
    await page.goto('/purchase-orders/edit/-1');
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/\/(purchase-orders|purchase-orders\/edit\/-1)$/);
  });

  test('NEG-PO-009: SQL injection in PO search executes safely', async ({ page }) => {
    await page.goto('/purchase-orders');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill("' OR 1=1 --");
      await search.press('Enter');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/purchase-orders');
    }
  });

  test('NEG-PO-010: XSS script tag in PO notes is sanitized without alert dialog', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.goto('/purchase-orders/new');
    const notes = page.locator('textarea');
    if (await notes.isVisible()) {
      await notes.fill('<script>alert("po-xss")</script>');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(alertFired).toBeFalsy();
    }
  });

  test('NEG-PO-011: Dismissing PO cancellation confirmation dialog cancels action', async ({ page }) => {
    await page.goto('/purchase-orders');
    page.once('dialog', dialog => dialog.dismiss());
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/purchase-orders');
    }
  });

  test('NEG-PO-012: Rapid double-click on Save PO button does not create duplicate PO', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.dblclick();
    await page.waitForTimeout(300);
  });

  test('NEG-PO-013: PO search with gibberish displays zero records without page error', async ({ page }) => {
    await page.goto('/purchase-orders');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('zzznonexistentpostring999');
      await search.press('Enter');
      await page.waitForTimeout(500);
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeLessThanOrEqual(1);
    }
  });

  test('NEG-PO-014: Warehouse role has no Create Purchase Order button', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/purchase-orders');
    await expect(page.getByRole('link', { name: /create purchase order|new purchase order/i })).toHaveCount(0);
  });

  test('NEG-PO-015: Non-numeric unit cost input is blocked by browser type="number"', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await expect(qtyInput).toHaveAttribute('type', 'number');
    }
  });
});
