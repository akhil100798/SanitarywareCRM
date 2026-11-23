const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { OrderPage } = require('../pages/OrderPage');

test.describe('Frontend Orders E2E Suite', () => {

  test.beforeAll(async () => {
    const { getAdminToken } = require('../../api/helpers/authHelper');
    const { getClient } = require('../../api/helpers/apiClient');
    const token = await getAdminToken();
    const client = await getClient(token);
    const existingOrders = await client.get('/api/orders');
    const ordersData = await existingOrders.json();
    const orderList = ordersData.content || ordersData;
    if (!orderList || orderList.length === 0) {
      const qRes = await client.post('/api/quotations', {
        data: {
          customerId: 1,
          items: [{ productId: 1, quantity: 2, unitPrice: 220 }]
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

  test('POS-052 List client orders and search', async ({ page }) => {
    await page.goto('/orders');
    await page.locator('span:has-text("Fetching order directory...")').waitFor({ state: 'detached', timeout: 35000 });
    const orderPage = new OrderPage(page);
    await expect(orderPage.tableRows.first()).toBeVisible();
  });

  test('POS-053 Download order tax invoice PDF', async ({ page }) => {
    await page.goto('/orders');
    await page.locator('span:has-text("Fetching order directory...")').waitFor({ state: 'detached', timeout: 35000 });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('table tr button[title="Download Invoice PDF"]').first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
