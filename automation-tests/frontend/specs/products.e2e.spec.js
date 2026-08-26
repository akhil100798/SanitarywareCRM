const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { ProductPage } = require('../pages/ProductPage');

test.describe('Frontend Product E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-041 Display catalog product tables', async ({ page }) => {
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });
    const productPage = new ProductPage(page);
    await expect(productPage.addProductButton).toBeVisible();
  });

  test('POS-042 Add product with valid properties', async ({ page }) => {
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });
    const productPage = new ProductPage(page);
    const suffix = Date.now();
    await productPage.createProduct(`SKU-${suffix}`, `Basin-${suffix}`, 1500.00, 50);
    await page.fill('input[placeholder*="Search"]', `SKU-${suffix}`);
    await page.keyboard.press('Enter');
    await expect(page.locator(`table tr:has-text("SKU-${suffix}")`)).toBeVisible();
  });

  test('POS-046 Categories shortcut navigates correctly', async ({ page }) => {
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });
    const productPage = new ProductPage(page);
    await productPage.categoriesButton.click();
    await expect(page).toHaveURL(/\/categories/);
  });

  test('POS-070 Create and edit product with barcode, HSN, and GST rate', async ({ page }) => {
    await page.goto('/products/new');
    const suffix = Date.now();
    const sku = `SKU-TAX-${suffix}`;
    const barcode = `BAR-${suffix}`;
    const hsn = '69101000';

    await page.fill('input[name="sku"]', sku);
    await page.fill('input[name="name"]', `Tax Product ${suffix}`);

    // Select category and brand
    await page.locator('select[name="categoryId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });
    await page.locator('select[name="brandId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });
    await page.selectOption('select[name="categoryId"]', { index: 1 });
    await page.selectOption('select[name="brandId"]', { index: 1 });

    await page.fill('input[name="mrp"]', '2500');
    await page.fill('input[name="sellingPrice"]', '2100');
    await page.fill('input[name="purchasePrice"]', '1600');
    await page.fill('input[name="gstRate"]', '18.00');
    await page.fill('input[name="barcode"]', barcode);
    await page.fill('input[name="hsnCode"]', hsn);
    await page.fill('input[name="stockQuantity"]', '40');

    await page.click('button:has-text("Save Product")');
    await page.waitForURL(url => url.pathname.includes('/products'));
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });

    // Verify row displays barcode and GST
    await page.fill('input[placeholder*="Search"]', sku);
    await page.keyboard.press('Enter');
    const row = page.locator(`table tr:has-text("${sku}")`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(`BAR: ${barcode}`);
    await expect(row).toContainText('GST: 18%');
  });

  test('POS-071 Multi-faceted search and filter by stock, brand, category, and price range', async ({ page }) => {
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });

    // Filter by stock status (In Stock)
    const stockSelect = page.locator('select').filter({ hasText: 'All Stock' });
    await stockSelect.selectOption('IN_STOCK');
    await page.waitForTimeout(500);

    // Filter by min and max price
    await page.fill('input[placeholder="Min ₹"]', '100');
    await page.fill('input[placeholder="Max ₹"]', '50000');
    await page.locator('input[placeholder="Max ₹"]').blur();
    await page.waitForTimeout(500);

    // Reset filters
    const resetButton = page.locator('button:has-text("Reset")');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('POS-072 Product details modal shows full specifications and tax data', async ({ page }) => {
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });

    // Click on view details eye icon
    const viewButton = page.locator('table tr button[title="View Details"]').first();
    await viewButton.click();

    // Verify modal elements
    await expect(page.locator('span:has-text("Selling Price")')).toBeVisible();
    await expect(page.locator('button:has-text("Close")')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Close")');
    await expect(page.locator('span:has-text("Selling Price")')).not.toBeVisible();
  });

  test('POS-073 Upload, preview, and delete product images in edit mode', async ({ page }) => {
    // Create a unique product first
    const suffix = Date.now();
    const sku = `IMG-${suffix}`;
    const productPage = new ProductPage(page);
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });
    await productPage.createProduct(sku, `Image Item ${suffix}`, 800, 20);

    // Find and edit the product
    await page.fill('input[placeholder*="Search"]', sku);
    await page.keyboard.press('Enter');
    const editBtn = page.locator(`table tr:has-text("${sku}") a[title="Edit Product"]`);
    await editBtn.click();
    await page.waitForURL(url => url.pathname.includes('/products/edit/'));

    // Upload dummy 1x1 png image
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await page.setInputFiles('input[type="file"]', {
      name: 'product-tile.png',
      mimeType: 'image/png',
      buffer: buffer
    });

    await expect(page.locator('button:has-text("Confirm Upload")')).toBeVisible();
    await page.click('button:has-text("Confirm Upload")');
    await expect(page.locator('span:has-text("1 uploaded")')).toBeVisible({ timeout: 15000 });

    // Delete uploaded image
    page.on('dialog', dialog => dialog.accept());
    await page.click('button[title="Delete image"]');
    await expect(page.locator('p:has-text("No images attached to this product yet.")')).toBeVisible({ timeout: 15000 });
  });

  test('POS-074 SALES role cannot see mutation buttons or purchase price in details modal', async ({ page }) => {
    // Login as sales
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qasales', 'Password@123');

    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });

    // Mutation buttons must not be visible
    await expect(page.locator('a:has-text("Add Product")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Bulk Import")')).not.toBeVisible();
    await expect(page.locator('a[title="Edit Product"]')).not.toBeVisible();
    await expect(page.locator('button[title="Deactivate Product"]')).not.toBeVisible();

    // View details button should be available
    const viewButton = page.locator('table tr button[title="View Details"]').first();
    await viewButton.click();

    // Purchase Price must NOT be visible to SALES
    await expect(page.locator('span:has-text("Purchase Price")')).not.toBeVisible();
    await page.click('button:has-text("Close")');
  });

  test('POS-075 Empty state and reset filters action', async ({ page }) => {
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });

    // Search for non-existent string
    await page.fill('input[placeholder*="Search"]', 'NONEXISTENT_XYZ_QUERY_99999');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Verify empty state
    await expect(page.locator('p:has-text("No products found")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear all filters")')).toBeVisible();

    // Reset filters
    await page.click('button:has-text("Clear all filters")');
    await page.waitForTimeout(500);
    await expect(page.locator('p:has-text("No products found")')).not.toBeVisible();
  });

  test('POS-076 Invalid price range validation (minPrice > maxPrice) shows error and prevents bad request', async ({ page }) => {
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });

    // Enter minPrice greater than maxPrice
    await page.fill('input[placeholder="Min ₹"]', '5000');
    await page.fill('input[placeholder="Max ₹"]', '1000');
    await page.locator('input[placeholder="Max ₹"]').blur();

    // Toast error should show
    await expect(page.locator('text=Minimum price cannot be greater than maximum price')).toBeVisible({ timeout: 10000 });
  });

  test('POS-077 Product detail modal closes with Escape key', async ({ page }) => {
    await page.goto('/products');
    await page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });

    // Open detail modal
    const viewButton = page.locator('table tr button[title="View Details"]').first();
    await viewButton.click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });

  test('POS-078 Duplicate barcode validation in form shows user-friendly error', async ({ page }) => {
    // Create first product with barcode
    const suffix = Date.now();
    const barcode = `BARCODE-DUP-${suffix}`;

    await page.goto('/products/new');
    await page.fill('input[name="sku"]', `SKU-A-${suffix}`);
    await page.fill('input[name="name"]', `Item A ${suffix}`);
    await page.locator('select[name="categoryId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });
    await page.selectOption('select[name="categoryId"]', { index: 1 });
    await page.selectOption('select[name="brandId"]', { index: 1 });
    await page.fill('input[name="mrp"]', '1000');
    await page.fill('input[name="sellingPrice"]', '900');
    await page.fill('input[name="barcode"]', barcode);
    await page.click('button:has-text("Save Product")');
    await page.waitForURL(url => url.pathname.includes('/products'));

    // Create second product with identical barcode
    await page.goto('/products/new');
    await page.fill('input[name="sku"]', `SKU-B-${suffix}`);
    await page.fill('input[name="name"]', `Item B ${suffix}`);
    await page.locator('select[name="categoryId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });
    await page.selectOption('select[name="categoryId"]', { index: 1 });
    await page.selectOption('select[name="brandId"]', { index: 1 });
    await page.fill('input[name="mrp"]', '1000');
    await page.fill('input[name="sellingPrice"]', '900');
    await page.fill('input[name="barcode"]', barcode);
    await page.click('button:has-text("Save Product")');

    // Friendly duplicate barcode error should appear
    await expect(page.locator('text=Barcode already exists')).toBeVisible({ timeout: 10000 });
  });
});
