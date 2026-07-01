const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test.describe('Frontend Login E2E Suite', () => {

  test('POS-036 Sign In successfully with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('NEG-041 Sign In with incorrect password shows error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'WrongPassword');
    await expect(loginPage.errorAlert).toBeVisible();
  });

  test('NEG-042 Submit empty login form is blocked', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.submitButton.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
