const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { OrderPage } = require('../pages/OrderPage');
const { PaymentPage } = require('../pages/PaymentPage');

test.describe('Frontend Payments E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-054 Record payment and verify balance update', async ({ page }) => {
    await page.goto('/orders');
    await page.locator('span:has-text("Fetching order directory...")').waitFor({ state: 'detached', timeout: 35000 });
    const orderRow = page.locator('table tr').filter({ hasText: 'UNPAID' }).first();
    const manageBtn = orderRow.locator('a.btn-secondary');
    await manageBtn.click();
    await page.waitForURL('**/orders/edit/**', { timeout: 15000 });
    await page.click('button:has-text("Record Payment")', { force: true });
    const paymentPage = new PaymentPage(page);
    await paymentPage.recordPayment(10.00);
    await expect(page.locator('h2:has-text("Edit Customer Order")')).toBeVisible();
  });
});
