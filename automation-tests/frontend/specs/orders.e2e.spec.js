const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { OrderPage } = require('../pages/OrderPage');

test.describe('Frontend Orders E2E Suite', () => {

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
