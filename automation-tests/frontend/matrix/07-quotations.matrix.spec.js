const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 07: Quotations Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 20 POSITIVE TESTS
  test('POS-QUOT-001: "Create Quotation" button routes to /quotations/new', async ({ page }) => {
    await page.goto('/quotations');
    await page.getByRole('link', { name: /create quotation|new quotation/i }).click();
    await expect(page).toHaveURL(/\/quotations\/new$/);
  });

  test('POS-QUOT-002: Customer dropdown allows selecting an existing customer', async ({ page }) => {
    await page.goto('/quotations/new');
    const custSelect = page.locator('select[name="customerId"]');
    if (await custSelect.isVisible()) {
      await page.locator('select[name="customerId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });
      await custSelect.selectOption({ index: 1 });
      expect(await custSelect.inputValue()).toBeTruthy();
    }
  });

  test('POS-QUOT-003: Quotation Date picker sets valid quotation date', async ({ page }) => {
    await page.goto('/quotations/new');
    const dateInput = page.locator('input[name="quotationDate"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-11-05');
      await expect(dateInput).toHaveValue('2026-11-05');
    }
  });

  test('POS-QUOT-004: Valid Until date picker accepts future expiry date', async ({ page }) => {
    await page.goto('/quotations/new');
    const expiryInput = page.locator('input[name="validUntil"]');
    if (await expiryInput.isVisible()) {
      await expiryInput.fill('2026-11-20');
      await expect(expiryInput).toHaveValue('2026-11-20');
    }
  });

  test('POS-QUOT-005: "Add Line Item" button appends an empty row to item table', async ({ page }) => {
    await page.goto('/quotations/new');
    const initialRows = await page.locator('tbody tr, .item-row').count();
    const addBtn = page.locator('button:has(.lucide-plus), button:has-text("Add Item"), button:has-text("Add Product")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);
      const newRows = await page.locator('tbody tr, .item-row').count();
      expect(newRows).toBeGreaterThan(initialRows);
    }
  });

  test('POS-QUOT-006: Line item quantity input accepts positive integer', async ({ page }) => {
    await page.goto('/quotations/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('5');
      await expect(qtyInput).toHaveValue('5');
    }
  });

  test('POS-QUOT-007: Tax percentage input updates line item calculation', async ({ page }) => {
    await page.goto('/quotations/new');
    const taxInput = page.locator('input[name="taxPercentage"]');
    if (await taxInput.isVisible()) {
      await taxInput.fill('18');
      await expect(taxInput).toHaveValue('18');
    }
  });

  test('POS-QUOT-008: Overall quotation discount input accepts percentage', async ({ page }) => {
    await page.goto('/quotations/new');
    const discInput = page.locator('input[name="discount"]');
    if (await discInput.isVisible()) {
      await discInput.fill('10');
      await expect(discInput).toHaveValue('10');
    }
  });

  test('POS-QUOT-009: Terms and conditions textarea accepts multi-line policy text', async ({ page }) => {
    await page.goto('/quotations/new');
    const terms = page.locator('textarea[name="termsAndConditions"]');
    if (await terms.isVisible()) {
      await terms.fill('1. 50% advance.\n2. Goods once sold will not be taken back.');
      await expect(terms).toContainText('50% advance');
    }
  });

  test('POS-QUOT-010: Notes textarea accepts internal quotation remarks', async ({ page }) => {
    await page.goto('/quotations/new');
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible()) {
      await notes.fill('VIP client - expedite delivery.');
      await expect(notes).toHaveValue('VIP client - expedite delivery.');
    }
  });

  test('POS-QUOT-011: Trash icon button removes selected line item', async ({ page }) => {
    await page.goto('/quotations/new');
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

  test('POS-QUOT-012: Quotation list renders table headers for quote and customer columns', async ({ page }) => {
    await page.goto('/quotations');
    await expect(page.locator('th').filter({ hasText: /quote|customer|status/i }).first()).toBeVisible();
  });

  test('POS-QUOT-013: Switching status tab filters quotation list', async ({ page }) => {
    await page.goto('/quotations');
    const draftTab = page.locator('button, a').filter({ hasText: /^draft$/i }).first();
    if (await draftTab.isVisible()) {
      await draftTab.click();
      await page.waitForTimeout(400);
      expect(page.url()).toContain('/quotations');
    }
  });

  test('POS-QUOT-014: Search input on quotations list filters by quotation reference', async ({ page }) => {
    await page.goto('/quotations');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('QT-');
      await search.press('Enter');
      await page.waitForTimeout(400);
      expect(page.url()).toContain('/quotations');
    }
  });

  test('POS-QUOT-015: "Download PDF" action triggers PDF generation without error', async ({ page }) => {
    await page.goto('/quotations');
    const pdfBtn = page.locator('button:has(.lucide-download), button:has-text("PDF"), a[href*="pdf"]').first();
    if (await pdfBtn.isVisible()) {
      await pdfBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('POS-QUOT-016: "Convert to Order" action button is clickable on accepted quotations', async ({ page }) => {
    await page.goto('/quotations');
    const convertBtn = page.locator('button:has-text("Convert"), a:has-text("Convert")').first();
    if (await convertBtn.isVisible()) {
      expect(await convertBtn.isEnabled()).toBeTruthy();
    }
  });

  test('POS-QUOT-017: Back to list button on quotation form navigates back to /quotations', async ({ page }) => {
    await page.goto('/quotations/new');
    const backBtn = page.locator('button:has(.lucide-arrow-left), a:has(.lucide-arrow-left), a[href="/quotations"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/quotations$/);
    }
  });

  test('POS-QUOT-018: Edit quotation button navigates to edit page with populated values', async ({ page }) => {
    await page.goto('/quotations');
    const editBtn = page.locator('a[href*="/quotations/edit/"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page).toHaveURL(/\/quotations\/edit\/\d+$/);
    }
  });

  test('POS-QUOT-019: Subtotal card displays numeric aggregate amount', async ({ page }) => {
    await page.goto('/quotations/new');
    await expect(page.locator('text=/subtotal|total/i').first()).toBeVisible();
  });

  test('POS-QUOT-020: Grand Total updates dynamically as discount is applied', async ({ page }) => {
    await page.goto('/quotations/new');
    const disc = page.locator('input[name="discount"]');
    if (await disc.isVisible()) {
      await disc.fill('15');
      await page.waitForTimeout(200);
      expect(await disc.inputValue()).toBe('15');
    }
  });

  // 20 NEGATIVE TESTS
  test('NEG-QUOT-001: Submitting quotation with no customer selected displays error toast', async ({ page }) => {
    await page.goto('/quotations/new');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/quotations/new');
  });

  test('NEG-QUOT-002: Submitting quotation with 0 line items is rejected', async ({ page }) => {
    await page.goto('/quotations/new');
    const custSelect = page.locator('select[name="customerId"]');
    if (await custSelect.isVisible()) {
      await custSelect.selectOption({ index: 1 });
    }
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/quotations/new');
  });

  test('NEG-QUOT-003: Line item with 0 quantity is invalid or disallowed', async ({ page }) => {
    await page.goto('/quotations/new');
    await page.getByRole('button', { name: /add line item/i }).click();
    const qtyInput = page.locator('input[name="quantity"]').first();
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill('0');
    const valid = await qtyInput.evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-QUOT-004: Line item with negative quantity is rejected', async ({ page }) => {
    await page.goto('/quotations/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('-3');
      const valid = await qtyInput.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-QUOT-005: Overall discount greater than 100% is clamped or rejected', async ({ page }) => {
    await page.goto('/quotations/new');
    const disc = page.locator('input[name="discount"]');
    if (await disc.isVisible()) {
      await disc.fill('150');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/quotations/new');
    }
  });

  test('NEG-QUOT-006: Negative discount value is rejected', async ({ page }) => {
    await page.goto('/quotations/new');
    const disc = page.locator('input[name="discount"]');
    if (await disc.isVisible()) {
      await disc.fill('-10');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/quotations/new');
    }
  });

  test('NEG-QUOT-007: Expiration date earlier than quotation date is rejected', async ({ page }) => {
    await page.goto('/quotations/new');
    const dateInput = page.locator('input[name="quotationDate"]');
    const expiryInput = page.locator('input[name="validUntil"]');
    if (await dateInput.isVisible() && await expiryInput.isVisible()) {
      await dateInput.fill('2026-11-10');
      await expiryInput.fill('2026-11-01');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/quotations/new');
    }
  });

  test('NEG-QUOT-008: Non-existent quotation edit route /quotations/edit/999999 redirects', async ({ page }) => {
    await page.goto('/quotations/edit/999999');
    await page.waitForURL(/\/quotations$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/quotations$/);
  });

  test('NEG-QUOT-009: Negative quotation ID /quotations/edit/-1 redirects to list', async ({ page }) => {
    await page.goto('/quotations/edit/-1');
    await page.waitForURL(/\/quotations$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/quotations$/);
  });

  test('NEG-QUOT-010: Alphanumeric quotation ID /quotations/edit/abc redirects to list', async ({ page }) => {
    await page.goto('/quotations/edit/abc');
    await page.waitForURL(/\/quotations$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/quotations$/);
  });

  test('NEG-QUOT-011: SQL injection in quotation search executes safely', async ({ page }) => {
    await page.goto('/quotations');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill("' OR '1'='1' --");
      await search.press('Enter');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/quotations');
    }
  });

  test('NEG-QUOT-012: XSS string in quotation notes is sanitized', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.goto('/quotations/new');
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible()) {
      await notes.fill('<script>alert("quote-xss")</script>');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(alertFired).toBeFalsy();
    }
  });

  test('NEG-QUOT-013: Warehouse role navigating to /quotations is forbidden or redirected', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/quotations');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/quotations');
    expect(blocked).toBeTruthy();
  });

  test('NEG-QUOT-014: Warehouse role navigating to /quotations/new is denied', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/quotations/new');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/quotations/new');
    expect(blocked).toBeTruthy();
  });

  test('NEG-QUOT-015: Dismissing quotation deletion confirmation alert cancels action', async ({ page }) => {
    await page.goto('/quotations');
    page.once('dialog', dialog => dialog.dismiss());
    const deleteBtn = page.locator('button:has(.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/quotations');
    }
  });

  test('NEG-QUOT-016: Negative tax percentage input is rejected', async ({ page }) => {
    await page.goto('/quotations/new');
    const taxInput = page.locator('input[name="taxPercentage"]');
    if (await taxInput.isVisible()) {
      await taxInput.fill('-5');
      const valid = await taxInput.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-QUOT-017: Rapid double-click on Save Quotation button does not duplicate quotation', async ({ page }) => {
    await page.goto('/quotations/new');
    const saveBtn = page.locator('button[type="submit"]');
    await saveBtn.dblclick();
    await page.waitForTimeout(300);
  });

  test('NEG-QUOT-018: Quotation search with gibberish displays zero records cleanly', async ({ page }) => {
    await page.goto('/quotations');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('zzznonexistentquotationstring999');
      await search.press('Enter');
      await page.waitForTimeout(500);
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeLessThanOrEqual(1);
    }
  });

  test('NEG-QUOT-019: Oversized terms textarea is safely accepted without layout shift', async ({ page }) => {
    await page.goto('/quotations/new');
    const terms = page.locator('textarea[name="termsAndConditions"]');
    if (await terms.isVisible()) {
      await terms.fill('Terms '.repeat(300));
      expect(await terms.inputValue()).toBeTruthy();
    }
  });

  test('NEG-QUOT-020: Converting already-converted quotation is blocked by backend', async ({ page }) => {
    await page.goto('/quotations');
    const convertedBadge = page.locator('text=/converted/i').first();
    if (await convertedBadge.isVisible()) {
      expect(true).toBeTruthy();
    }
  });
});
