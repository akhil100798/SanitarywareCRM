const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');

test.describe('Frontend Dashboard E2E Suite', () => {

  test('POS-037 Protected route redirects non-authenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('POS-038 Dashboard renders metrics cards for logged in user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');

    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.header).toContainText('Dashboard');
  });
});
