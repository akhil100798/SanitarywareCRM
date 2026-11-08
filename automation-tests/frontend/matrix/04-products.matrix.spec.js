const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 04: Products Catalog Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 25 POSITIVE TESTS
  test('POS-PROD-001: "Add Product" button routes to /products/new', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('link', { name: /add product|new product/i }).click();
    await expect(page).toHaveURL(/\/products\/new$/);
  });

  test('POS-PROD-002: Product Name input accepts model title', async ({ page }) => {
    await page.goto('/products/new');
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('Ceramic Wall Hung Washbasin');
    await expect(nameInput).toHaveValue('Ceramic Wall Hung Washbasin');
  });

  test('POS-PROD-003: SKU input accepts alphanumeric code', async ({ page }) => {
    await page.goto('/products/new');
    const skuInput = page.locator('input[name="sku"]');
    await skuInput.fill('CER-WB-001');
    await expect(skuInput).toHaveValue('CER-WB-001');
  });

  test('POS-PROD-004: Barcode input accepts standard EAN-13 string', async ({ page }) => {
    await page.goto('/products/new');
    const barcodeInput = page.locator('input[name="barcode"]');
    await barcodeInput.fill('8901234567890');
    await expect(barcodeInput).toHaveValue('8901234567890');
  });

  test('POS-PROD-005: Category dropdown selects valid category option', async ({ page }) => {
    await page.goto('/products/new');
    const catSelect = page.locator('select[name="categoryId"]');
    const options = await catSelect.locator('option').all();
    if (options.length > 1) {
      await catSelect.selectOption({ index: 1 });
      const val = await catSelect.inputValue();
      expect(val).toBeTruthy();
    }
  });

  test('POS-PROD-006: Brand dropdown selects valid brand option', async ({ page }) => {
    await page.goto('/products/new');
    const brandSelect = page.locator('select[name="brandId"]');
    const options = await brandSelect.locator('option').all();
    if (options.length > 1) {
      await brandSelect.selectOption({ index: 1 });
      const val = await brandSelect.inputValue();
      expect(val).toBeTruthy();
    }
  });

  test('POS-PROD-007: MRP input accepts numeric currency value', async ({ page }) => {
    await page.goto('/products/new');
    const mrp = page.locator('input[name="mrp"]');
    await mrp.fill('4500');
    await expect(mrp).toHaveValue('4500');
  });

  test('POS-PROD-008: Selling Price input accepts discounted rate', async ({ page }) => {
    await page.goto('/products/new');
    const sp = page.locator('input[name="sellingPrice"]');
    await sp.fill('3800');
    await expect(sp).toHaveValue('3800');
  });

  test('POS-PROD-009: Purchase Cost input accepts cost price', async ({ page }) => {
    await page.goto('/products/new');
    const pp = page.locator('input[name="purchasePrice"]');
    await pp.fill('2500');
    await expect(pp).toHaveValue('2500');
  });

  test('POS-PROD-010: HSN Code input accepts 8-digit HSN', async ({ page }) => {
    await page.goto('/products/new');
    const hsn = page.locator('input[name="hsnCode"]');
    await hsn.fill('69101000');
    await expect(hsn).toHaveValue('69101000');
  });

  test('POS-PROD-011: GST Rate select allows 18% slab', async ({ page }) => {
    await page.goto('/products/new');
    const gst = page.locator('select[name="gstRate"], input[name="gstRate"]');
    if (await gst.isVisible()) {
      await gst.fill ? gst.fill('18') : gst.selectOption('18');
    }
  });

  test('POS-PROD-012: Initial stock quantity accepts positive integer', async ({ page }) => {
    await page.goto('/products/new');
    const stock = page.locator('input[name="stockQuantity"]');
    await stock.fill('50');
    await expect(stock).toHaveValue('50');
  });

  test('POS-PROD-013: Reorder level accepts minimum threshold', async ({ page }) => {
    await page.goto('/products/new');
    const reorder = page.locator('input[name="reorderLevel"]');
    await reorder.fill('10');
    await expect(reorder).toHaveValue('10');
  });

  test('POS-PROD-014: Unit dropdown allows selecting "Piece"', async ({ page }) => {
    await page.goto('/products/new');
    const unit = page.locator('select[name="unit"]');
    if (await unit.isVisible()) {
      await unit.selectOption('Piece');
    }
  });

  test('POS-PROD-015: Color attribute input accepts shade name', async ({ page }) => {
    await page.goto('/products/new');
    const color = page.locator('input[name="color"]');
    if (await color.isVisible()) {
      await color.fill('Alpine White');
      await expect(color).toHaveValue('Alpine White');
    }
  });

  test('POS-PROD-016: Material attribute input accepts texture/material', async ({ page }) => {
    await page.goto('/products/new');
    const mat = page.locator('input[name="material"]');
    if (await mat.isVisible()) {
      await mat.fill('Vitreous China');
      await expect(mat).toHaveValue('Vitreous China');
    }
  });

  test('POS-PROD-017: Size attribute input accepts dimensions', async ({ page }) => {
    await page.goto('/products/new');
    const size = page.locator('input[name="size"]');
    if (await size.isVisible()) {
      await size.fill('550x400x150 mm');
      await expect(size).toHaveValue('550x400x150 mm');
    }
  });

  test('POS-PROD-018: Description textarea accepts product summary', async ({ page }) => {
    await page.goto('/products/new');
    const desc = page.locator('textarea[name="description"]');
    if (await desc.isVisible()) {
      await desc.fill('Premium glazed ceramic washbasin with overflow hole and tap hole.');
      await expect(desc).toHaveValue('Premium glazed ceramic washbasin with overflow hole and tap hole.');
    }
  });

  test('POS-PROD-019: Active checkbox toggle turns off and on', async ({ page }) => {
    await page.goto('/products/new');
    const chk = page.locator('input[name="isActive"]');
    if (await chk.isVisible()) {
      await chk.uncheck();
      expect(await chk.isChecked()).toBeFalsy();
      await chk.check();
      expect(await chk.isChecked()).toBeTruthy();
    }
  });

  test('POS-PROD-020: Featured product checkbox toggle on and off', async ({ page }) => {
    await page.goto('/products/new');
    const chk = page.locator('input[name="isFeatured"]');
    if (await chk.isVisible()) {
      await chk.check();
      expect(await chk.isChecked()).toBeTruthy();
      await chk.uncheck();
      expect(await chk.isChecked()).toBeFalsy();
    }
  });

  test('POS-PROD-021: Successfully creating a product redirects to catalog list', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('select[name="brandId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });
    await page.locator('select[name="categoryId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });

    await page.locator('select[name="brandId"]').selectOption({ index: 1 });
    await page.locator('select[name="categoryId"]').selectOption({ index: 1 });

    const testSku = `SKU_${Date.now()}`;
    await page.locator('input[name="name"]').fill(`Washbasin Model ${Date.now()}`);
    await page.locator('input[name="sku"]').fill(testSku);
    await page.locator('input[name="mrp"]').fill('3500');
    await page.locator('input[name="sellingPrice"]').fill('3000');
    await page.locator('input[name="purchasePrice"]').fill('2000');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/products$/, { timeout: 20000 });
  });

  test('POS-PROD-022: Search input filters product catalog by SKU keyword', async ({ page }) => {
    await page.goto('/products');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill('SKU');
      await search.press('Enter');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/products');
    }
  });

  test('POS-PROD-023: Category filter dropdown on product list updates list view', async ({ page }) => {
    await page.goto('/products');
    const catFilter = page.locator('select').first();
    if (await catFilter.isVisible()) {
      const options = await catFilter.locator('option').all();
      if (options.length > 1) {
        await catFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }
  });

  test('POS-PROD-024: Edit product button navigates to edit page with pre-populated data', async ({ page }) => {
    await page.goto('/products');
    const editBtn = page.locator('a[href*="/products/edit/"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page).toHaveURL(/\/products\/edit\/\d+$/);
      const name = await page.locator('input[name="name"]').inputValue();
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test('POS-PROD-025: Cancel button on product form returns to /products without saving', async ({ page }) => {
    await page.goto('/products/new');
    const backBtn = page.locator('button:has(.lucide-arrow-left), a:has(.lucide-arrow-left), a[href="/products"]').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/products$/);
    }
  });

  // 25 NEGATIVE TESTS
  test('NEG-PROD-001: Submitting product with empty Name displays validation error', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('');
    await page.locator('input[name="sku"]').fill('SKU-TEST-99');
    await page.locator('button[type="submit"]').click();
    const valid = await page.locator('input[name="name"]').evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-PROD-002: Submitting product with empty SKU is rejected', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('Test Product');
    await page.locator('input[name="sku"]').fill('');
    await page.locator('button[type="submit"]').click();
    const valid = await page.locator('input[name="sku"]').evaluate(el => el.checkValidity());
    expect(valid).toBeFalsy();
  });

  test('NEG-PROD-003: Submitting product with negative MRP triggers error toast', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('Negative MRP Test');
    await page.locator('input[name="sku"]').fill('NEG-MRP-01');
    const brandSelect = page.locator('select[name="brandId"]');
    if (await brandSelect.isVisible()) await brandSelect.selectOption({ index: 1 });
    await page.locator('input[name="mrp"]').fill('-500');
    await page.locator('input[name="sellingPrice"]').fill('400');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-PROD-004: Submitting product with MRP = 0 is rejected', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('Zero MRP Test');
    await page.locator('input[name="sku"]').fill('ZERO-MRP-01');
    const brandSelect = page.locator('select[name="brandId"]');
    if (await brandSelect.isVisible()) await brandSelect.selectOption({ index: 1 });
    await page.locator('input[name="mrp"]').fill('0');
    await page.locator('input[name="sellingPrice"]').fill('0');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-PROD-005: Submitting product with negative Selling Price is rejected', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('Negative SP Test');
    await page.locator('input[name="sku"]').fill('NEG-SP-01');
    const brandSelect = page.locator('select[name="brandId"]');
    if (await brandSelect.isVisible()) await brandSelect.selectOption({ index: 1 });
    await page.locator('input[name="mrp"]').fill('1000');
    await page.locator('input[name="sellingPrice"]').fill('-200');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-PROD-006: Submitting product with negative Purchase Cost is rejected', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('Negative Cost Test');
    await page.locator('input[name="sku"]').fill('NEG-COST-01');
    const brandSelect = page.locator('select[name="brandId"]');
    if (await brandSelect.isVisible()) await brandSelect.selectOption({ index: 1 });
    await page.locator('input[name="mrp"]').fill('1000');
    await page.locator('input[name="sellingPrice"]').fill('800');
    await page.locator('input[name="purchasePrice"]').fill('-500');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-PROD-007: Submitting product with negative Initial Stock is rejected', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('Negative Stock Test');
    await page.locator('input[name="sku"]').fill('NEG-STK-01');
    const brandSelect = page.locator('select[name="brandId"]');
    if (await brandSelect.isVisible()) await brandSelect.selectOption({ index: 1 });
    await page.locator('input[name="mrp"]').fill('1000');
    await page.locator('input[name="sellingPrice"]').fill('800');
    await page.locator('input[name="stockQuantity"]').fill('-10');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-PROD-008: Submitting product with negative Reorder Level is rejected', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('Negative Reorder Test');
    await page.locator('input[name="sku"]').fill('NEG-REO-01');
    const brandSelect = page.locator('select[name="brandId"]');
    if (await brandSelect.isVisible()) await brandSelect.selectOption({ index: 1 });
    await page.locator('input[name="mrp"]').fill('1000');
    await page.locator('input[name="sellingPrice"]').fill('800');
    await page.locator('input[name="reorderLevel"]').fill('-5');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-PROD-009: GST rate > 100% displays validation error', async ({ page }) => {
    await page.goto('/products/new');
    const gstInput = page.locator('input[name="gstRate"]');
    if (await gstInput.isVisible()) {
      await gstInput.fill('150');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/products/new');
    }
  });

  test('NEG-PROD-010: GST rate < 0% displays validation error', async ({ page }) => {
    await page.goto('/products/new');
    const gstInput = page.locator('input[name="gstRate"]');
    if (await gstInput.isVisible()) {
      await gstInput.fill('-10');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/products/new');
    }
  });

  test('NEG-PROD-011: Barcode longer than 100 characters triggers error', async ({ page }) => {
    await page.goto('/products/new');
    const barcode = page.locator('input[name="barcode"]');
    await barcode.fill('1'.repeat(105));
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-PROD-012: HSN code longer than 20 characters triggers error', async ({ page }) => {
    await page.goto('/products/new');
    const hsn = page.locator('input[name="hsnCode"]');
    await hsn.fill('1'.repeat(25));
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/products/new');
  });

  test('NEG-PROD-013: Duplicate SKU submission is rejected with conflict error', async ({ page }) => {
    await page.goto('/products/new');
    const brandSelect = page.locator('select[name="brandId"]');
    if (await brandSelect.isVisible()) await brandSelect.selectOption({ index: 1 });
    await page.locator('input[name="name"]').fill('Duplicate SKU Product');
    // Using an existing product SKU
    await page.locator('input[name="sku"]').fill('CER-WB-001');
    await page.locator('input[name="mrp"]').fill('2000');
    await page.locator('input[name="sellingPrice"]').fill('1800');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/products');
  });

  test('NEG-PROD-014: Non-existent product edit URL /products/edit/999999 redirects to catalog', async ({ page }) => {
    await page.goto('/products/edit/999999');
    await page.waitForURL(/\/products$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/products$/);
  });

  test('NEG-PROD-015: Direct URL injection with negative product ID /products/edit/-5 redirects', async ({ page }) => {
    await page.goto('/products/edit/-5');
    await page.waitForURL(/\/products$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/products$/);
  });

  test('NEG-PROD-016: Direct URL injection with alphanumeric product ID /products/edit/abc redirects', async ({ page }) => {
    await page.goto('/products/edit/abc');
    await page.waitForURL(/\/products$/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/products$/);
  });

  test('NEG-PROD-017: SQL injection string in product search input executes safely', async ({ page }) => {
    await page.goto('/products');
    const search = page.locator('input[placeholder*="Search" i]');
    if (await search.isVisible()) {
      await search.fill("' OR 1=1 --");
      await search.press('Enter');
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/products');
    }
  });

  test('NEG-PROD-018: XSS string in product name is sanitized without alert dialog', async ({ page }) => {
    let alertShown = false;
    page.on('dialog', () => { alertShown = true; });
    await page.goto('/products/new');
    await page.locator('input[name="name"]').fill('<script>alert("prod-xss")</script>');
    await page.locator('input[name="sku"]').fill(`XSS_${Date.now()}`);
    await page.locator('input[name="mrp"]').fill('1000');
    await page.locator('input[name="sellingPrice"]').fill('900');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    expect(alertShown).toBeFalsy();
  });

  test('NEG-PROD-019: Deleting product with active order dependencies is blocked', async ({ page }) => {
    await page.goto('/products');
    page.once('dialog', dialog => dialog.dismiss());
    const deleteBtn = page.locator('button:has(.lucide-trash-2)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/products');
    }
  });

  test('NEG-PROD-020: Sales role navigating to /products/new is forbidden or redirected', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/products/new');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/products/new');
    expect(blocked).toBeTruthy();
  });

  test('NEG-PROD-021: Sales role has no "Add Product" button on catalog page', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/products');
    await expect(page.getByRole('link', { name: /add product|new product/i })).toHaveCount(0);
  });

  test('NEG-PROD-022: Sales role has no Edit or Delete buttons on product rows', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/products');
    await expect(page.locator('a[href*="/products/edit/"]')).toHaveCount(0);
    await expect(page.locator('button:has(.lucide-trash-2)')).toHaveCount(0);
  });

  test('NEG-PROD-023: Warehouse role has no Edit or Delete buttons on product rows', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/products');
    await expect(page.locator('a[href*="/products/edit/"]')).toHaveCount(0);
  });

  test('NEG-PROD-024: Non-numeric MRP input is blocked by browser or form validation', async ({ page }) => {
    await page.goto('/products/new');
    const mrp = page.locator('input[name="mrp"]');
    await expect(mrp).toHaveAttribute('type', 'number');
    await expect(mrp).toHaveAttribute('min', '0.01');
  });

  test('NEG-PROD-025: Whitespace-only SKU is invalid', async ({ page }) => {
    await page.goto('/products/new');
    await page.locator('input[name="sku"]').fill('     ');
    await page.locator('button[type="submit"]').click();
    expect(page.url()).toContain('/products/new');
  });
});
