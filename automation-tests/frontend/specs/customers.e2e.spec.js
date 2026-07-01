const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CustomerPage } = require('../pages/CustomerPage');

test.describe('Frontend Customer E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-044 Save customer profile successfully', async ({ page }) => {
    await page.goto('/customers');
    const customerPage = new CustomerPage(page);
    const suffix = Date.now();
    await customerPage.createCustomer(`Rahul Dev ${suffix}`, `999${suffix.toString().slice(-7)}`);
    await expect(page.locator(`table tr:has-text("Rahul Dev ${suffix}")`)).toBeVisible();
  });

  test('NEG-048 Inline validation rejects invalid emails format', async ({ page }) => {
    await page.goto('/customers');
    const customerPage = new CustomerPage(page);
    await customerPage.addCustomerButton.click();
    await page.fill('input[name="email"]', 'bad-email');
    await page.click('button:has-text("Save")');
    // Expect error feedback
    await expect(page.locator('.text-danger')).toBeVisible();
  });
});
