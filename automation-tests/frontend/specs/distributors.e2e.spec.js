const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DistributorPage } = require('../pages/DistributorPage');

test.describe('Frontend Distributor E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-045 Create new distributor successfully', async ({ page }) => {
    await page.goto('/distributors');
    await page.locator('td:has-text("Loading distributors...")').waitFor({ state: 'detached', timeout: 35000 });
    const distributorPage = new DistributorPage(page);
    const suffix = Date.now();
    await distributorPage.createDistributor(`Supply Corp ${suffix}`, '8881234567');
    await page.fill('input[placeholder*="Search"]', `Supply Corp ${suffix}`);
    await page.keyboard.press('Enter');
    await expect(page.locator(`table tr:has-text("Supply Corp ${suffix}")`)).toBeVisible();
  });
});
