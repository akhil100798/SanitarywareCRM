const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { ProductPage } = require('../pages/ProductPage');

test.describe('Frontend Product E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-041 Display catalog product tables', async ({ page }) => {
    await page.goto('/products');
    const productPage = new ProductPage(page);
    await expect(productPage.addProductButton).toBeVisible();
  });

  test('POS-042 Add product with valid properties', async ({ page }) => {
    await page.goto('/products');
    const productPage = new ProductPage(page);
    const suffix = Date.now();
    await productPage.createProduct(`SKU-${suffix}`, `Basin-${suffix}`, 1500.00, 50);
    await expect(page.locator(`table tr:has-text("SKU-${suffix}")`)).toBeVisible();
  });

  test('POS-046 Categories shortcut navigates correctly', async ({ page }) => {
    await page.goto('/products');
    const productPage = new ProductPage(page);
    await productPage.categoriesButton.click();
    await expect(page).toHaveURL(/\/categories/);
  });
});
