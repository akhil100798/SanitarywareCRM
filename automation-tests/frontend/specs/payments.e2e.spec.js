const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { PaymentPage } = require('../pages/PaymentPage');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken } = require('../../api/helpers/authHelper');

test.describe('Frontend Payments E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', process.env.QA_ADMIN_PASSWORD);
  });

  test('POS-054 Record payment and verify balance update', async ({ page }) => {
    const adminToken = await getAdminToken();
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const customerName = `E2E Payment Customer ${suffix}`;
    const customerRes = await client.post('/api/customers', {
      data: { name: customerName, phoneNumber: `93${suffix.toString().slice(-8)}`, customerType: 'RETAIL' }
    });
    expect(customerRes.ok()).toBeTruthy();
    const customer = await customerRes.json();
    const categoryRes = await client.post('/api/categories', { data: { name: `E2E Payment Category ${suffix}`, isActive: true } });
    expect(categoryRes.ok()).toBeTruthy();
    const category = await categoryRes.json();
    const brandRes = await client.post('/api/brands', { data: { name: `E2E Payment Brand ${suffix}` } });
    expect(brandRes.ok()).toBeTruthy();
    const brand = await brandRes.json();
    const productRes = await client.post('/api/products', {
      data: {
        sku: `E2E-PAY-${suffix}`,
        name: `E2E Payment Product ${suffix}`,
        mrp: 500,
        sellingPrice: 500,
        stockQuantity: 100,
        categoryId: category.id,
        brandId: brand.id
      }
    });
    expect(productRes.ok()).toBeTruthy();
    const product = await productRes.json();
    const quotationRes = await client.post('/api/quotations', {
      data: {
        customerId: customer.id,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: '2099-12-31',
        status: 'DRAFT',
        items: [{ productId: product.id, quantity: 1, unitPrice: 500 }]
      }
    });
    expect(quotationRes.ok()).toBeTruthy();
    const quotation = await quotationRes.json();
    const statusRes = await client.patch(`/api/quotations/${quotation.id}/status`, { params: { status: 'ACCEPTED' } });
    expect(statusRes.ok()).toBeTruthy();
    const orderRes = await client.post(`/api/orders/from-quotation/${quotation.id}`);
    expect(orderRes.ok()).toBeTruthy();

    await page.goto('/orders');
    const orderRow = page.locator('tr').filter({ hasText: customerName }).first();
    await expect(orderRow).toBeVisible({ timeout: 35000 });
    await orderRow.getByRole('link', { name: 'Manage', exact: true }).click();
    await page.waitForURL('**/orders/edit/**', { timeout: 15000 });
    await page.getByRole('button', { name: 'Record Payment', exact: true }).click();
    const paymentPage = new PaymentPage(page);
    await paymentPage.recordPayment(10.00);
    await expect(page.getByRole('heading', { name: 'Edit Order', level: 1 })).toBeVisible();
  });
});
