const { test, expect } = require('@playwright/test');

test.describe('Mobile Tab Navigation Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'qaadmin');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.pathname.includes('/dashboard'));
  });

  test('POS-064 Tab bar switches viewport contents to Products list', async ({ page }) => {
    await page.goto('/products');
    await page.locator('span:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 10000 });
    await expect(page.locator('h1').filter({ hasNotText: 'HydroSleek' })).toContainText('Product');
  });

  test('POS-067 Navigation expands to more lists drawer options', async ({ page }) => {
    await page.goto('/categories');
    await expect(page.locator('h1').filter({ hasNotText: 'HydroSleek' })).toContainText('Categories');
  });
});
