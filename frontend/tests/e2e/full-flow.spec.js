import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8081';
if (!process.env.QA_ADMIN_PASSWORD) throw new Error('QA_ADMIN_PASSWORD is required for legacy E2E');

const test = base.extend({
  qa: async ({ request }, use) => {
    const response = await request.post(API_URL + '/api/auth/login', {
      data: { username: process.env.QA_ADMIN_USERNAME || 'qaadmin', password: process.env.QA_ADMIN_PASSWORD }
    });
    expect(response.ok()).toBeTruthy();
    const auth = await response.json();
    const owned = [];
    const headers = { Authorization: 'Bearer ' + auth.token };
    const call = (method, path, data) => request[method](API_URL + '/api' + path, { headers, ...(data ? { data } : {}) });
    const remember = (resource, record) => { owned.push({ resource, id: record.id }); return record; };
    const create = async (resource, data) => {
      const res = await call('post', '/' + resource, data);
      expect(res.ok(), resource + ' fixture creation failed: HTTP ' + res.status()).toBeTruthy();
      return remember(resource, await res.json());
    };
    const suffix = randomUUID().slice(0, 12);
    const assets = async () => {
      const brand = await create('brands', { name: 'Legacy brand ' + suffix });
      const category = await create('categories', { name: 'Legacy category ' + suffix });
      const customer = await create('customers', { name: 'Legacy customer ' + suffix,
        phoneNumber: '9' + String(Date.now()).slice(-9), customerType: 'RETAIL' });
      const product = await create('products', { sku: 'LEGACY-' + suffix, name: 'Legacy product ' + suffix,
        categoryId: category.id, brandId: brand.id, mrp: 500, sellingPrice: 500, stockQuantity: 100 });
      return { brand, category, customer, product };
    };
    const order = async () => {
      const refs = await assets();
      return create('orders', { customerId: refs.customer.id, orderDate: new Date().toISOString().slice(0, 10),
        taxPercentage: 0, discount: 0, items: [{ productId: refs.product.id, quantity: 1, unitPrice: 500 }] });
    };
    try { await use({ auth, suffix, call, remember, create, assets, order }); }
    finally {
      const results = [];
      for (const item of [...owned].reverse()) {
        let path = '/' + item.resource + '/' + item.id;
        if (item.resource === 'quotations') {
          const quote = await (await call('get', path)).json();
          path = '/qa/quotations/' + item.id + '?customerName=' + encodeURIComponent(quote.customerName);
        }
        const res = await call('delete', path);
        results.push({ ...item, status: res.status() });
        expect([200, 204, 404], 'Owned-fixture cleanup ' + item.resource + '/' + item.id).toContain(res.status());
      }
      const dir = new URL('../../../reports/legacy-fixtures/', import.meta.url);
      mkdirSync(dir, { recursive: true });
      writeFileSync(new URL(suffix + '.json', dir), JSON.stringify({ owned, results }, null, 2));
    }
  }
});

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL + '/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.QA_ADMIN_USERNAME || 'qaadmin');
  await page.getByLabel('Password', { exact: true }).fill(process.env.QA_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(BASE_URL + '/dashboard');
});

test.describe('Sanitaryware CRM End-to-End Automation Flow', () => {
  test('Flow 1: Authentication & Redirect Check', async ({ page, qa }) => {
    await expect(page).toHaveTitle(/Sanitaryware CRM/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(qa.auth.fullName);
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Customers', exact: true })).toBeVisible();
  });

  test('Flow 2: Category CRUD Verification', async ({ page, qa }) => {
    const name = 'Legacy category UI ' + qa.suffix;
    await page.goto(BASE_URL + '/categories');
    await page.getByRole('button', { name: 'Add Category', exact: true }).click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('textbox', { name: /name/i }).fill(name);
    await modal.getByRole('textbox', { name: /description/i }).fill('Owned disposable category');
    const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/categories'));
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    qa.remember('categories', await (await created).json());
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /edit/i }).click();
    await modal.getByRole('textbox', { name: /name/i }).fill(name + ' edited');
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: name + ' edited' })).toBeVisible();
  });

  test('Flow 3: Product CRUD Verification', async ({ page, qa }) => {
    const refs = await qa.assets();
    const sku = 'LEGACY-UI-' + qa.suffix;
    await page.goto(BASE_URL + '/products');
    await page.getByRole('link', { name: 'Add Product', exact: true }).click();
    await page.getByRole('textbox', { name: 'Product SKU', exact: true }).fill(sku);
    await page.getByRole('textbox', { name: 'Product Name', exact: true }).fill('Legacy UI product ' + qa.suffix);
    await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption(String(refs.category.id));
    await page.getByRole('combobox', { name: 'Brand', exact: true }).selectOption(String(refs.brand.id));
    await page.getByRole('spinbutton', { name: 'MRP (₹)', exact: true }).fill('125');
    await page.getByRole('spinbutton', { name: 'Selling Price (₹)', exact: true }).fill('125');
    await page.getByRole('spinbutton', { name: 'Stock Quantity', exact: true }).fill('100');
    const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/products'));
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    const product = qa.remember('products', await (await created).json());
    await page.getByLabel('Search products', { exact: true }).fill(sku);
    await page.getByLabel('Search products', { exact: true }).press('Enter');
    await expect(page.getByRole('row').filter({ hasText: sku })).toBeVisible();
    const persisted = await (await qa.call('get', '/products/' + product.id)).json();
    expect(persisted.sku).toBe(sku); expect(persisted.sellingPrice).toBe(125); expect(persisted.stockQuantity).toBe(100);
  });

  test('Flow 4: Customer CRUD Verification', async ({ page, qa }) => {
    const name = 'Legacy UI customer ' + qa.suffix;
    await page.goto(BASE_URL + '/customers');
    await page.getByTestId('add-customer-primary').click();
    await page.getByRole('textbox', { name: 'Full Name', exact: true }).fill(name);
    await page.getByRole('textbox', { name: 'Phone Number', exact: true }).fill('8' + String(Date.now()).slice(-9));
    const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/customers'));
    await page.getByRole('button', { name: /Save Customer/i }).click();
    qa.remember('customers', await (await created).json());
    await page.getByRole('searchbox', { name: 'Search customers', exact: true }).fill(name);
    await page.getByRole('searchbox', { name: 'Search customers', exact: true }).press('Enter');
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await row.getByRole('link', { name: 'Edit customer', exact: true }).click();
    await page.getByRole('textbox', { name: 'Full Name', exact: true }).fill(name + ' edited');
    await page.getByRole('button', { name: /Save Customer/i }).click();
    await page.getByRole('searchbox', { name: 'Search customers', exact: true }).fill(name + ' edited');
    await page.getByRole('searchbox', { name: 'Search customers', exact: true }).press('Enter');
    await expect(page.getByRole('row').filter({ hasText: name + ' edited' })).toBeVisible();
  });

  test('Flow 5: Quotation to Order Conversion Flow', async ({ page, qa }) => {
    const refs = await qa.assets();
    await page.goto(BASE_URL + '/quotations');
    await page.getByRole('link', { name: 'New Quotation', exact: true }).click();
    await page.getByRole('combobox', { name: 'Customer', exact: true }).selectOption(String(refs.customer.id));
    await page.getByRole('button', { name: 'Add Line Item', exact: true }).click();
    await page.getByRole('button', { name: 'Select Product', exact: true }).click();
    await page.getByTestId('product-search-input').fill(refs.product.sku);
    await page.getByTestId('product-search-result-' + refs.product.id).click();
    // The picker closes after selection; line quantity is the first numeric control in the line-items table.
    await page.getByRole('table').getByRole('spinbutton').first().fill('2');
    const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/quotations'));
    await page.getByRole('button', { name: 'Save Quotation', exact: true }).click();
    const quote = qa.remember('quotations', await (await created).json());
    const row = page.getByRole('row').filter({ hasText: quote.quotationNumber });
    await expect(row).toContainText(/Draft/i);
    await row.getByRole('button', { name: 'Mark Accepted', exact: true }).click();
    await expect(row).toContainText(/Accepted/i);
    await page.getByTestId('quotation-edit-' + quote.id).click();
    page.once('dialog', dialog => dialog.accept());
    const converted = page.waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/api/orders/from-quotation/'));
    await page.getByRole('button', { name: 'Convert to Order', exact: true }).click();
    const order = qa.remember('orders', await (await converted).json());
    await expect(page).toHaveURL(BASE_URL + '/orders/edit/' + order.id);
    expect(order.customerId).toBe(refs.customer.id); expect(order.items[0].quantity).toBe(2);
    const persisted = await (await qa.call('get', '/quotations/' + quote.id)).json();
    expect(persisted.status).toBe('CONVERTED'); expect(order.total).toBe(quote.total);
  });

  test('Flow 6: Payment Capture & Balance Update', async ({ page, qa }) => {
    const order = await qa.order();
    expect(order.paidAmount).toBe(0); expect(order.balanceAmount).toBe(500);
    await page.goto(BASE_URL + '/orders/edit/' + order.id);
    await page.getByRole('button', { name: 'Record Payment', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Payment Amount', exact: true }).fill('50');
    const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/payments'));
    await page.getByRole('button', { name: 'Record Receipt', exact: true }).click();
    qa.remember('payments', await (await created).json());
    await expect(page).toHaveURL(BASE_URL + '/orders/edit/' + order.id);
    const persisted = await (await qa.call('get', '/orders/' + order.id)).json();
    expect(persisted.paidAmount).toBe(50); expect(persisted.balanceAmount).toBe(450); expect(persisted.paymentStatus).toBe('PARTIAL');
  });

  test('Flow 7: Dynamic PDF Invoice Download', async ({ page, qa }) => {
    const order = await qa.order();
    await page.goto(BASE_URL + '/orders');
    await page.getByRole('searchbox', { name: 'Search orders', exact: true }).fill(order.orderNumber);
    const row = page.getByRole('row').filter({ hasText: order.orderNumber });
    await expect(row).toBeVisible();
    const downloading = page.waitForEvent('download');
    await row.getByRole('button', { name: 'Download Invoice PDF', exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    expect((await download.failure())).toBeNull();
    const bytes = readFileSync(await download.path());
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF'); expect(bytes.length).toBeGreaterThan(100);
  });
});
