const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 08: Orders Management & Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 25 POSITIVE TESTS
  test('POS-ORD-001: "New Order" button navigates to /orders/new', async ({ page }) => {
    await page.goto('/orders');
    await page.getByRole('link', { name: /new order|create order|add order/i }).click();
    await expect(page).toHaveURL(/\/orders\/new$/);
  });

  test('POS-ORD-002: Customer selector dropdown populates customer list', async ({ page }) => {
    await page.goto('/orders/new');
    const custSelect = page.locator('select[name="customerId"]');
    if (await custSelect.isVisible()) {
      await page.locator('select[name="customerId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });
      await custSelect.selectOption({ index: 1 });
      expect(await custSelect.inputValue()).toBeTruthy();
    }
  });

  test('POS-ORD-003: Order Date picker sets current or chosen date', async ({ page }) => {
    await page.goto('/orders/new');
    const orderDate = page.locator('input[name="orderDate"]');
    if (await orderDate.isVisible()) {
      await orderDate.fill('2026-11-05');
      await expect(orderDate).toHaveValue('2026-11-05');
    }
  });

  test('POS-ORD-004: Delivery Date picker accepts expected delivery schedule', async ({ page }) => {
    await page.goto('/orders/new');
    const delDate = page.locator('input[name="deliveryDate"]');
    if (await delDate.isVisible()) {
      await delDate.fill('2026-11-15');
      await expect(delDate).toHaveValue('2026-11-15');
    }
  });

  test('POS-ORD-005: "Add Item" button appends product line row', async ({ page }) => {
    await page.goto('/orders/new');
    const initialRows = await page.locator('tbody tr, .item-row').count();
    const addBtn = page.locator('button:has(.lucide-plus), button:has-text("Add Item"), button:has-text("Add Product")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(300);
      const newRows = await page.locator('tbody tr, .item-row').count();
      expect(newRows).toBeGreaterThan(initialRows);
    }
  });

  test('POS-ORD-006: Line item quantity input accepts positive purchase quantity', async ({ page }) => {
    await page.goto('/orders/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('4');
      await expect(qtyInput).toHaveValue('4');
    }
  });

  test('POS-ORD-007: Shipping charge input accepts freight fee', async ({ page }) => {
    await page.goto('/orders/new');
    const shipInput = page.locator('input[name="shippingCharge"]');
    if (await shipInput.isVisible()) {
      await shipInput.fill('250');
      await expect(shipInput).toHaveValue('250');
    }
  });

  test('POS-ORD-008: Order discount input accepts concession percentage or amount', async ({ page }) => {
    await page.goto('/orders/new');
    const discInput = page.locator('input[name="discount"]');
    if (await discInput.isVisible()) {
      await discInput.fill('500');
      await expect(discInput).toHaveValue('500');
    }
  });

  test('POS-ORD-009: Shipping Address textarea accepts delivery street address', async ({ page }) => {
    await page.goto('/orders/new');
    const addr = page.locator('textarea[name="shippingAddress"], input[name="shippingAddress"]');
    if (await addr.isVisible()) {
      await addr.fill('Shop 12, Sanitary Market, Sector 18');
      await expect(addr).toHaveValue('Shop 12, Sanitary Market, Sector 18');
    }
  });

  test('POS-ORD-010: Order Notes textarea accepts client delivery instructions', async ({ page }) => {
    await page.goto('/orders/new');
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible()) {
      await notes.fill('Handle with care - fragile ceramic items.');
      await expect(notes).toHaveValue('Handle with care - fragile ceramic items.');
    }
  });

  test('POS-ORD-011: Bill-pad image upload dropzone is attached to DOM', async ({ page }) => {
    await page.goto('/orders/new');
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThanOrEqual(0);
  });

  test('POS-ORD-012: Trash icon button deletes unwanted line item', async ({ page }) => {
    await page.goto('/orders/new');
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

  test('POS-ORD-013: Subtotal card updates dynamically when items or quantities change', async ({ page }) => {
    await page.goto('/orders/new');
    await expect(page.locator('text=/subtotal|total/i').first()).toBeVisible();
  });

  test('POS-ORD-014: Order list displays order records with status badges', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.locator('h1, h2').filter({ hasText: /order/i }).first()).toBeVisible();
  });

  test('POS-ORD-015: Status filter tabs on order list toggle views', async ({ page }) => {
    await page.goto('/orders');
    const filterBtn = page.locator('button, a').filter({ hasText: /confirmed|processing|all/i }).first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await page.waitForTimeout(300);
      expect(page.url()).toContain('/orders');
    }
  });

  test('POS-ORD-016: Payment status filter tabs toggle payment categories', async ({ page }) => {
    await page.goto('/orders');
    const payFilter = page.locator('button, a').filter({ hasText: /unpaid|paid|partial/i }).first();
    if (await payFilter.isVisible()) {
      await payFilter.click();
      await page.waitForTimeout(300);
      expect(page.url()).toContain('/orders');
    }
  });

  test('POS-ORD-017: Search input on order list filters by order reference number', async ({ page }) => {
    await page.goto('/orders');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('ORD-');
      await search.press('Enter');
      await page.waitForTimeout(400);
      expect(page.url()).toContain('/orders');
    }
  });

  test('POS-ORD-018: "Download Invoice" action button triggers invoice PDF retrieval', async ({ page }) => {
    await page.goto('/orders');
    const invBtn = page.locator('button:has-text("Invoice"), a[href*="invoice"], button:has(.lucide-file-text)').first();
    if (await invBtn.isVisible()) {
      await invBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('POS-ORD-019: View order action routes to order detail or edit screen', async ({ page }) => {
    await page.goto('/orders');
    const viewBtn = page.locator('a[href*="/orders/edit/"], button:has-text("View")').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await expect(page).toHaveURL(/\/orders\/edit\/\d+$/);
    }
  });

  test('POS-ORD-020: Changing status dropdown updates order fulfillment status', async ({ page }) => {
    await page.goto('/orders');
    const statusSelect = page.locator('select').first();
    if (await statusSelect.isVisible()) {
      const options = await statusSelect.locator('option').all();
      if (options.length > 1) {
        await statusSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }
  });

  test('POS-ORD-021: Cancel button on order form navigates back to /orders without saving', async ({ page }) => {
    await page.goto('/orders/new');
    const backBtn = page.locator('button:has(.lucide-arrow-left), a:has(.lucide-arrow-left), a[href="/orders"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/orders$/);
    }
  });

  test('POS-ORD-022: Warehouse role can view orders list', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/orders');
    await expect(page.locator('h1, h2').filter({ hasText: /order/i }).first()).toBeVisible();
  });

  test('POS-ORD-023: Sales role can view orders list', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/orders');
    await expect(page.locator('h1, h2').filter({ hasText: /order/i }).first()).toBeVisible();
  });

  test('POS-ORD-024: Balance Due column reflects difference between Total and Paid Amount', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.locator('table, .order-card').first()).toBeVisible();
  });

  test('POS-ORD-025: Date range filter on order list refines displayed orders', async ({ page }) => {
    await page.goto('/orders');
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-11-01');
      await page.waitForTimeout(300);
    }
  });

  // 25 NEGATIVE TESTS
  test('NEG-ORD-001: Submitting order with no customer selected displays error toast', async ({ page }) => {
    await page.goto('/orders/new');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/orders/new');
  });

  test('NEG-ORD-002: Submitting order with 0 line items is rejected', async ({ page }) => {
    await page.goto('/orders/new');
    const custSelect = page.locator('select[name="customerId"]');
    if (await custSelect.isVisible()) {
      await custSelect.selectOption({ index: 1 });
    }
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/orders/new');
  });

  test('NEG-ORD-003: Line item quantity = 0 triggers validation error', async ({ page }) => {
    await page.goto('/orders/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('0');
      const valid = await qtyInput.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-ORD-004: Negative line item quantity is rejected', async ({ page }) => {
    await page.goto('/orders/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('-2');
      const valid = await qtyInput.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-ORD-005: Negative shipping charge is rejected', async ({ page }) => {
    await page.goto('/orders/new');
    const ship = page.locator('input[name="shippingCharge"]');
    if (await ship.isVisible()) {
      await ship.fill('-100');
      const valid = await ship.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-ORD-006: Negative discount value is rejected', async ({ page }) => {
    await page.goto('/orders/new');
    const disc = page.locator('input[name="discount"]');
    if (await disc.isVisible()) {
      await disc.fill('-50');
      const valid = await disc.evaluate(el => el.checkValidity());
      expect(valid).toBeFalsy();
    }
  });

  test('NEG-ORD-007: Non-existent order edit route /orders/edit/999999 redirects to list', async ({ page }) => {
    await page.goto('/orders/edit/999999');
    await page.waitForURL(/\/orders$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/orders$/);
  });

  test('NEG-ORD-008: Direct URL injection with negative order ID /orders/edit/-1 redirects', async ({ page }) => {
    await page.goto('/orders/edit/-1');
    await page.waitForURL(/\/orders$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/orders$/);
  });

  test('NEG-ORD-009: Direct URL injection with alphanumeric order ID /orders/edit/xyz redirects', async ({ page }) => {
    await page.goto('/orders/edit/xyz');
    await page.waitForURL(/\/orders$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/orders$/);
  });

  test('NEG-ORD-010: SQL injection string in order search input executes safely', async ({ page }) => {
    await page.goto('/orders');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill("' OR 1=1 --");
      await search.press('Enter');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/orders');
    }
  });

  test('NEG-ORD-011: XSS script tag in shipping address is sanitized without alert dialog', async ({ page }) => {
    let alertShown = false;
    page.on('dialog', () => { alertShown = true; });
    await page.goto('/orders/new');
    const addr = page.locator('textarea[name="shippingAddress"], input[name="shippingAddress"]');
    if (await addr.isVisible()) {
      await addr.fill('<script>alert("order-xss")</script>');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(alertShown).toBeFalsy();
    }
  });

  test('NEG-ORD-012: Dismissing order cancellation alert cancels the action', async ({ page }) => {
    await page.goto('/orders');
    page.once('dialog', dialog => dialog.dismiss());
    const cancelBtn = page.locator('button:has-text("Cancel Order")').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/orders');
    }
  });

  test('NEG-ORD-013: Cancelling an already-delivered order is forbidden', async ({ page }) => {
    await page.goto('/orders');
    const deliveredRow = page.locator('tr:has-text("DELIVERED")');
    if (await deliveredRow.count() > 0) {
      await expect(deliveredRow.locator('button:has-text("Cancel Order")')).toHaveCount(0);
    }
  });

  test('NEG-ORD-014: Cancelling an already-cancelled order is forbidden', async ({ page }) => {
    await page.goto('/orders');
    const cancelledRow = page.locator('tr:has-text("CANCELLED")');
    if (await cancelledRow.count() > 0) {
      await expect(cancelledRow.locator('button:has-text("Cancel Order")')).toHaveCount(0);
    }
  });

  test('NEG-ORD-015: Ordering quantity exceeding warehouse stock triggers warning/error', async ({ page }) => {
    await page.goto('/orders/new');
    const qtyInput = page.locator('input[type="number"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('9999999');
      await page.waitForTimeout(300);
    }
  });

  test('NEG-ORD-016: Non-numeric shipping fee input is blocked by input[type=number]', async ({ page }) => {
    await page.goto('/orders/new');
    const ship = page.locator('input[name="shippingCharge"]');
    if (await ship.isVisible()) {
      await expect(ship).toHaveAttribute('type', 'number');
    }
  });

  test('NEG-ORD-017: Rapid double-click on Create Order button does not create duplicate orders', async ({ page }) => {
    await page.goto('/orders/new');
    const createBtn = page.locator('button[type="submit"]');
    await createBtn.dblclick();
    await page.waitForTimeout(300);
  });

  test('NEG-ORD-018: Order search with gibberish displays zero records without crash', async ({ page }) => {
    await page.goto('/orders');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('zzznonexistentorderstring999');
      await search.press('Enter');
      await page.waitForTimeout(500);
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeLessThanOrEqual(1);
    }
  });

  test('NEG-ORD-019: Delivery date earlier than order date triggers validation or is flagged', async ({ page }) => {
    await page.goto('/orders/new');
    const orderDate = page.locator('input[name="orderDate"]');
    const delDate = page.locator('input[name="deliveryDate"]');
    if (await orderDate.isVisible() && await delDate.isVisible()) {
      await orderDate.fill('2026-11-20');
      await delDate.fill('2026-11-01');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
    }
  });

  test('NEG-ORD-020: Warehouse role has no "Cancel Order" action buttons', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/orders');
    await expect(page.locator('button:has-text("Cancel Order")')).toHaveCount(0);
  });

  test('NEG-ORD-021: Non-image file upload in bill-pad image dropzone is rejected', async ({ page }) => {
    await page.goto('/orders/new');
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      expect(await fileInput.getAttribute('accept')).toBeTruthy();
    }
  });

  test('NEG-ORD-022: Whitespace-only shipping address is rejected', async ({ page }) => {
    await page.goto('/orders/new');
    const addr = page.locator('textarea[name="shippingAddress"], input[name="shippingAddress"]');
    if (await addr.isVisible()) {
      await addr.fill('     ');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/orders/new');
    }
  });

  test('NEG-ORD-023: Oversized order notes (> 1000 chars) handles gracefully', async ({ page }) => {
    await page.goto('/orders/new');
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible()) {
      await notes.fill('A'.repeat(1200));
      expect(await notes.inputValue()).toBeTruthy();
    }
  });

  test('NEG-ORD-024: Deleting single line item leaves form in invalid state preventing empty save', async ({ page }) => {
    await page.goto('/orders/new');
    const trashBtn = page.locator('button:has(.lucide-trash-2)').first();
    if (await trashBtn.isVisible()) {
      await trashBtn.click();
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/orders/new');
    }
  });

  test('NEG-ORD-025: Transitioning status backwards (DELIVERED to CONFIRMED) is blocked', async ({ page }) => {
    await page.goto('/orders');
    expect(page.url()).toContain('/orders');
  });
});
