const { test, expect } = require('@playwright/test');

test.describe('Mobile Viewport Login Suite', () => {

  test('POS-061 App launch displays welcome or login layout', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });

  test('POS-062 Login saves authentication credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'qaadmin');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('NEG-066 Sign in fails with invalid password details', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'qaadmin');
    await page.fill('input[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message, .alert-danger')).toBeVisible();
  });
});
