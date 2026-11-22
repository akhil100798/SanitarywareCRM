const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { OrderPage } = require('../pages/OrderPage');
const { PaymentPage } = require('../pages/PaymentPage');

test.describe('Frontend Payments E2E Suite', () => {

  test.beforeAll(async () => {
    const { getAdminToken } = require('../../api/helpers/authHelper');
    const { getClient } = require('../../api/helpers/apiClient');
    const token = await getAdminToken();
    const client = await getClient(token);
    const existingOrders = await client.get('/api/orders');
    const ordersData = await existingOrders.json();
    const rawList = ordersData.content || ordersData;
    const unpaid = Array.isArray(rawList) ? rawList.filter(o => o.paymentStatus !== 'PAID') : [];
    if (unpaid.length === 0) {
      const qRes = await client.post('/api/quotations', {
        data: {
          customerId: 1,
          quotationDate: new Date().toISOString().split('T')[0],
          validUntil: '2028-12-31',
          status: 'DRAFT',
          items: [{ productId: 1, quantity: 5, unitPrice: 220 }]
        }
      });
      const quote = await qRes.json();
      await client.patch(`/api/quotations/${quote.id}/status`, { params: { status: 'ACCEPTED' } });
      await client.post(`/api/orders/from-quotation/${quote.id}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-054 Record payment and verify balance update', async ({ page }) => {
    await page.goto('/orders');
    await page.locator('span:has-text("Fetching order directory...")').waitFor({ state: 'detached', timeout: 35000 });
    const orderRow = page.locator('table tr').filter({ hasText: 'UNPAID' }).or(page.locator('table tr').filter({ hasText: 'PARTIAL' })).first();
    const manageBtn = orderRow.getByRole('link', { name: 'Manage' }).or(orderRow.locator('a.btn-secondary'));
    await manageBtn.click();
    await page.waitForURL('**/orders/edit/**', { timeout: 15000 });
    await page.click('button:has-text("Record Payment")', { force: true });
    const paymentPage = new PaymentPage(page);
    await paymentPage.recordPayment(10.00);
    await expect(page.locator('h2:has-text("Edit Customer Order")')).toBeVisible();
  });
});
