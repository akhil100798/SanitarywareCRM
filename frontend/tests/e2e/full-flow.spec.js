import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';

test.describe('Sanitaryware CRM End-to-End Automation Flow', () => {

    test('Flow 1: Authentication & Redirect Check', async ({ page }) => {
        // Navigate to Login Page
        await page.goto(`${BASE_URL}/login`);
        await expect(page).toHaveTitle(/Sanitaryware CRM/i);

        // Fill credentials
        await page.fill('input[name="username"]', 'qaadmin');
        await page.fill('input[name="password"]', 'Password@123');
        await page.click('button[type="submit"]');

        // Check redirection to Dashboard
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        await expect(page.locator('h1')).toContainText(/Dashboard/i);
    });

    test('Flow 2: Category CRUD Verification', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'qaadmin');
        await page.fill('input[name="password"]', 'Password@123');
        await page.click('button[type="submit"]');

        // Navigate to Categories
        await page.click('a[href="/categories"]');
        await expect(page).toHaveURL(`${BASE_URL}/categories`);

        // Click Add Category Form Modal
        await page.click('button:has-text("Add Category")');
        await page.fill('input[name="name"]', 'Plumbing PVC');
        await page.fill('textarea[name="description"]', 'PVC Category for pipes');
        await page.click('button:has-text("Save")');

        // Verify category listed in UI
        const categoryRow = page.locator('table tr:has-text("Plumbing PVC")');
        await expect(categoryRow).toBeVisible();

        // Edit Category
        await categoryRow.locator('button.btn-edit').first().click();
        await page.fill('input[name="name"]', 'Plumbing PVC Modified');
        await page.click('button:has-text("Save")');

        // Verify name changed in table
        await expect(page.locator('table tr:has-text("Plumbing PVC Modified")')).toBeVisible();
    });

    test('Flow 3: Product CRUD Verification', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'qaadmin');
        await page.fill('input[name="password"]', 'Password@123');
        await page.click('button[type="submit"]');

        // Navigate to Products List
        await page.click('a[href="/products"]');
        await expect(page).toHaveURL(`${BASE_URL}/products`);

        // Click Add Product Form
        await page.click('button:has-text("Add Product")');
        await page.fill('input[name="sku"]', 'E2E-TEST-SKU');
        await page.fill('input[name="name"]', 'E2E Playwright Test Product');
        await page.fill('input[name="sellingPrice"]', '125.00');
        await page.fill('input[name="stockQuantity"]', '100');
        await page.click('button:has-text("Save")');

        // Verify product displays in list
        const productRow = page.locator('table tr:has-text("E2E-TEST-SKU")');
        await expect(productRow).toBeVisible();
    });

    test('Flow 4: Customer CRUD Verification', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'qaadmin');
        await page.fill('input[name="password"]', 'Password@123');
        await page.click('button[type="submit"]');

        // Navigate to Customers list
        await page.click('a[href="/customers"]');
        await expect(page).toHaveURL(`${BASE_URL}/customers`);

        // Click Add Customer Form
        await page.click('button:has-text("Add Customer")');
        await page.fill('input[name="name"]', 'Ramesh Sharma');
        await page.fill('input[name="phoneNumber"]', '9123456789');
        await page.click('button:has-text("Save")');

        // Verify customer in table
        const customerRow = page.locator('table tr:has-text("Ramesh Sharma")');
        await expect(customerRow).toBeVisible();

        // Edit customer
        await customerRow.locator('button.btn-edit').first().click();
        await page.fill('input[name="name"]', 'Ramesh Sharma Modified');
        await page.click('button:has-text("Save")');

        // Verify name changed in table
        await expect(page.locator('table tr:has-text("Ramesh Sharma Modified")')).toBeVisible();
    });

    test('Flow 5: Quotation to Order Conversion Flow', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'qaadmin');
        await page.fill('input[name="password"]', 'Password@123');
        await page.click('button[type="submit"]');

        // Navigate to Quotations List
        await page.click('a[href="/quotations"]');
        await page.click('button:has-text("Create Quotation")');

        // Fill quotation details
        await page.selectOption('select[name="customerId"]', { label: 'Ramesh Sharma Modified' });
        await page.click('button:has-text("Add Item")');
        await page.selectOption('select[name="productId"]', { label: 'E2E Playwright Test Product' });
        await page.fill('input[name="quantity"]', '10');
        await page.click('button:has-text("Save Quotation")');

        // Verify quotation status is DRAFT
        const quoteRow = page.locator('table tr:has-text("Ramesh Sharma Modified")').first();
        await expect(quoteRow.locator('.badge')).toContainText(/DRAFT/i);

        // Click Accept status
        await quoteRow.locator('button.btn-accept').click();
        await expect(quoteRow.locator('.badge')).toContainText(/ACCEPTED/i);

        // Click Convert to Order
        await quoteRow.locator('button.btn-convert').click();
        await expect(page).toHaveURL(/\/orders\/\d+/);
    });

    test('Flow 6: Payment Capture & Balance Update', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'qaadmin');
        await page.fill('input[name="password"]', 'Password@123');
        await page.click('button[type="submit"]');

        // Open last order
        await page.click('a[href="/orders"]');
        await page.click('table tr:has-text("Ramesh Sharma Modified") a.btn-manage');

        // Record Partial Payment
        await page.click('button:has-text("Record Payment")');
        await page.fill('input[name="amount"]', '500.00');
        await page.click('button:has-text("Submit Payment")');

        // Verify balance decreased
        const balanceField = page.locator('.balance-due-value');
        await expect(balanceField).not.toContainText('0.00');
    });

    test('Flow 7: Dynamic PDF Invoice Download', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'qaadmin');
        await page.fill('input[name="password"]', 'Password@123');
        await page.click('button[type="submit"]');

        // Go to Orders list and click Download Invoice
        await page.click('a[href="/orders"]');
        
        // Setup download listener
        const downloadPromise = page.waitForEvent('download');
        await page.locator('table tr:has-text("Ramesh Sharma Modified") button.btn-download-pdf').first().click();
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.pdf');
    });

});
