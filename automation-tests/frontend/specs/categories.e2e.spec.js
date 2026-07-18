const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { CategoryPage } = require('../pages/CategoryPage');

test.describe('Frontend Category E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-039 Renders active categories list grid', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.sidebarCategoriesLink.click();
    await expect(page).toHaveURL(/\/categories/);
  });

  test('POS-040 Can create a category successfully', async ({ page }) => {
    await page.goto('/categories');
    const categoryPage = new CategoryPage(page);
    const suffix = Date.now();
    await categoryPage.createCategory(`Ceramics ${suffix}`, 'Vitreous china items');
    await expect(page.locator(`table tr:has-text("Ceramics ${suffix}")`)).toBeVisible({ timeout: 15000 });
  });
});
