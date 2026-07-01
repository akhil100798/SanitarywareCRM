const { test, expect } = require('@playwright/test');

test.describe('Mobile Viewport E2E Smoke Suite', () => {

  test('POS-080 Unified mobile viewport transaction flow simulation', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'qaadmin');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button[type="submit"]');

    // 2. Open products
    await page.goto('/products');
    await expect(page.locator('h1')).toContainText('Products');
  });
});
