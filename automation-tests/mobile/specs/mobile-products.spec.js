const { test, expect } = require('@playwright/test');

test.describe('Mobile Product Viewport Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'qaadmin');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button[type="submit"]');
  });

  test('POS-065 Browse product cards in mobile layout', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('table, .product-card-list').first()).toBeVisible();
  });
});
