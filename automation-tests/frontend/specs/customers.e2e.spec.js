const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CustomerPage } = require('../pages/CustomerPage');

test.describe('Frontend Customer E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', process.env.QA_ADMIN_PASSWORD);
  });

  test('POS-044 Save customer profile successfully', async ({ page }) => {
    await page.goto('/customers');
    await page.locator('span:has-text("Fetching customer list...")').waitFor({ state: 'detached', timeout: 35000 });
    await expect(page.getByTestId('add-customer-primary')).toHaveCount(1);
    const customerPage = new CustomerPage(page);
    const suffix = Date.now();
    await customerPage.createCustomer(`Rahul Dev ${suffix}`, `999${suffix.toString().slice(-7)}`);
    await page.fill('input[placeholder*="Search"]', `Rahul Dev ${suffix}`);
    await page.keyboard.press('Enter');
    await expect(page.locator(`table tr:has-text("Rahul Dev ${suffix}")`)).toBeVisible();
  });

  test('NEG-048 Inline validation rejects invalid emails format', async ({ page }) => {
    await page.goto('/customers');
    await page.locator('span:has-text("Fetching customer list...")').waitFor({ state: 'detached', timeout: 35000 });
    const customerPage = new CustomerPage(page);
    await customerPage.addCustomerButton.click();
    await page.waitForURL(url => url.pathname.includes('/customers/new'));
    await page.fill('input[name="email"]', 'bad-email');
    await page.getByRole('button', { name: 'Save Customer', exact: true }).click();
    // Expect error feedback
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
