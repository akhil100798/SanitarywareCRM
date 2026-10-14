const { test, expect } = require('@playwright/test');

test('navigation actions are single accessible controls, not buttons nested in links', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('qaadmin');
  await page.getByLabel('Password', { exact: true }).fill(process.env.QA_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const route of ['/dashboard', '/customers', '/products', '/orders', '/quotations',
    '/distributors', '/distributor-payments', '/purchase-orders', '/payments/new']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Structural oracle only. Interactions use semantic controls, not these CSS selectors.
    await expect(page.locator('a button, button a'), route).toHaveCount(0);
  }
  await page.goto('/customers');
  await page.getByRole('link', { name: 'Add customer from page header', exact: true }).click();
  await expect(page).toHaveURL(/\/customers\/new$/);

  await page.goto('/products');
  await expect(page.getByRole('link', { name: 'Categories', exact: true })).toHaveCount(1);
  const categoryShortcut = page.getByRole('link', { name: 'Manage product categories', exact: true });
  await expect(categoryShortcut).toHaveCount(1);
  await categoryShortcut.click();
  await expect(page).toHaveURL(/\/categories$/);
  await expect(page.getByRole('heading', { name: 'Categories', exact: true })).toBeVisible();
});
