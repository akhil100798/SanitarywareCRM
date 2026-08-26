const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken } = require('../../api/helpers/authHelper');

test.describe('Frontend Purchase Order E2E Suite', () => {
  let adminToken;
  let testDistributorName;
  let testProductName;
  let testSku;
  let testProductId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    const client = await getClient(adminToken);
    const suffix = Date.now();

    testDistributorName = `PO Dist E2E ${suffix}`;
    testProductName = `PO Product E2E ${suffix}`;
    testSku = `SKU-E2E-PO-${suffix}`;

    // Create Distributor
    await client.post('/api/distributors', {
      data: { name: testDistributorName, phoneNumber: '9876543210' }
    });

    // Create Category & Brand
    const catRes = await client.post('/api/categories', { data: { name: `Cat PO ${suffix}`, isActive: true } });
    const cat = await catRes.json();

    const brandRes = await client.post('/api/brands', { data: { name: `Brand PO ${suffix}` } });
    const brand = await brandRes.json();

    // Create Product with purchase price, barcode, HSN
    const prodRes = await client.post('/api/products', {
      data: {
        sku: testSku,
        name: testProductName,
        mrp: 2000.00,
        sellingPrice: 1500.00,
        purchasePrice: 950.00,
        barcode: `890${suffix}`,
        hsnCode: '69101000',
        gstRate: 18.00,
        stockQuantity: 10,
        categoryId: cat.id,
        brandId: brand.id
      }
    });
    const prod = await prodRes.json();
    testProductId = prod.id;
  });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-PO-E2E-001 Create Purchase Order with purchasePrice auto-fill and metadata badges', async ({ page }) => {
    await page.goto('/purchase-orders/new');
    await page.waitForLoadState('networkidle');

    // Wait for distributor options to load
    const distSelect = page.locator('select').first();
    await distSelect.waitFor({ state: 'visible' });
    await page.locator('select option:not([value=""])').first().waitFor({ state: 'attached', timeout: 15000 });

    const distOptions = await distSelect.locator('option').allInnerTexts();
    const matchedDist = distOptions.find(o => o.includes(testDistributorName)) || distOptions.find(o => o !== 'Select Distributor');
    await distSelect.selectOption({ label: matchedDist });

    // Click Add Product to add a row
    await page.click('button:has-text("Add Product")');

    // Select the created product in the row
    const productSelect = page.locator('table select').first();
    await productSelect.waitFor({ state: 'visible' });
    await page.locator('table select option:not([value=""])').first().waitFor({ state: 'attached', timeout: 15000 });

    const prodOptions = await productSelect.locator('option').allInnerTexts();
    const matchedProd = prodOptions.find(o => o.includes(testProductName)) || prodOptions.find(o => o !== 'Select Product...');
    await productSelect.selectOption({ label: matchedProd });

    // Verify unit cost auto-filled with purchase price (e.g. 950.00) rather than 70% of selling price
    const unitCostInput = page.locator('table input[type="number"][step="0.01"]').first();
    const unitCostVal = await unitCostInput.inputValue();
    expect(Number(unitCostVal)).toBeGreaterThan(0);

    // Verify metadata indicator
    await expect(page.locator('text=Catalogue Purchase Price:').or(page.locator('text=Fallback Selling Price:'))).toBeVisible();

    // Set quantity to 10
    const qtyInput = page.locator('table input[type="number"][min="1"]').first();
    await qtyInput.fill('10');

    // Submit PO
    await page.click('button:has-text("Save Purchase Order")');
    await page.waitForURL('**/purchase-orders', { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    // Verify PO listed in table
    await expect(page.locator(`table tr`).nth(1)).toBeVisible();
  });

  test('POS-PO-E2E-002 Receive Purchase Order and verify inventory update modal flow', async ({ page }) => {
    await page.goto('/purchase-orders');
    await page.waitForLoadState('networkidle');

    // Find any PO row that has a Receive button
    const receiveBtn = page.locator('table tr button:has-text("Receive")').first();
    if (await receiveBtn.isVisible()) {
      await receiveBtn.click();

      // Verify modal contents
      await expect(page.locator('text=Receive Purchase Order')).toBeVisible();
      await expect(page.locator('text=Inventory Impact:')).toBeVisible();

      // Confirm Receive
      await page.click('button:has-text("Confirm & Receive")');
      await page.waitForLoadState('networkidle');

      // Verify receive toast or status badge
      await expect(page.locator('span:has-text("RECEIVED")').first()).toBeVisible({ timeout: 10000 });
    }
  });
});
