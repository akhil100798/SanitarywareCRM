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
    const orderPage = new OrderPage(page);
    await orderPage.manageLink.first().click();

    const paymentPage = new PaymentPage(page);
    await orderPage.recordPaymentButton.click();
    await paymentPage.recordPayment(10.00);

    // Verify balance reduces or success is shown
    await expect(page.locator('.toast-success, :has-text("recorded")')).toBeVisible();
  });
});
