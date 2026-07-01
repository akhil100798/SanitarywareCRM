const { test, expect } = require('@playwright/test');

test.describe('Mobile Dashboard Viewport Suite', () => {

  test('POS-063 Renders sales indicators widgets dynamically', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'qaadmin');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.stats-card, .widget').first()).toBeVisible();
  });
});
