const { test, expect } = require('@playwright/test');

const credentials = {
  SALES: { username: 'qasales', password: 'Password@123' },
  ADMIN: { username: 'qaadmin', password: 'Password@123' },
  MANAGER: { username: 'qamanager', password: 'Password@123' },
};

async function loginAs(page, role) {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill(credentials[role].username);
  await page.locator('input[name="password"]').fill(credentials[role].password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 25000 });
  await expect(page.getByText(role, { exact: true })).toBeVisible();
}

test.describe('Role-aware frontend access', () => {
  test('SALES sidebar hides management-only links', async ({ page }) => {
    await loginAs(page, 'SALES');

    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Distributors', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Purchase Orders', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Distributor Payments', exact: true })).toHaveCount(0);
  });

  test('SALES direct settings access shows the unauthorized page', async ({ page }) => {
    await loginAs(page, 'SALES');

    await page.goto('/settings');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByText('You don\u2019t have access to this page.', { exact: true })).toBeVisible();
  });

  test('ADMIN sidebar shows management links', async ({ page }) => {
    await loginAs(page, 'ADMIN');

    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Distributors', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Purchase Orders', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Distributor Payments', exact: true })).toBeVisible();
  });

  test('ADMIN can open settings', async ({ page }) => {
    await loginAs(page, 'ADMIN');

    await page.getByRole('link', { name: 'Settings', exact: true }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('button', { name: /save settings/i })).toBeVisible();
  });

  test('MANAGER can open settings', async ({ page }) => {
    await loginAs(page, 'MANAGER');

    await page.getByRole('link', { name: 'Settings', exact: true }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('button', { name: /save settings/i })).toBeVisible();
  });

  test('SALES dashboard greeting uses the user name or role fallback', async ({ page }) => {
    await loginAs(page, 'SALES');
    const user = await page.evaluate(() => JSON.parse(sessionStorage.getItem('user')));
    const expectedName = user?.fullName?.trim() || user?.name?.trim() || 'Sales Staff';
    const greeting = page.getByRole('heading', { name: /^Hello,/ });

    await expect(greeting).toHaveText(`Hello, ${expectedName}`);
    await expect(greeting).not.toHaveText('Hello, Administrator');
  });

  test('SALES can read products without mutation controls', async ({ page }) => {
    await loginAs(page, 'SALES');

    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Product Catalog', level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder(/search by name, sku, or brand/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Product', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Bulk Import', exact: true })).toHaveCount(0);
    await expect(page.getByTitle('Edit Product')).toHaveCount(0);
    await expect(page.getByTitle('Deactivate Product')).toHaveCount(0);
  });

  test('SALES can read categories and brands without mutation controls', async ({ page }) => {
    await loginAs(page, 'SALES');

    await page.goto('/categories');
    await expect(page.getByRole('heading', { name: 'Categories', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Category', exact: true })).toHaveCount(0);
    await expect(page.getByTitle('Edit Category')).toHaveCount(0);
    await expect(page.getByTitle('Deactivate Category')).toHaveCount(0);

    await page.goto('/brands');
    await expect(page.getByRole('heading', { name: 'Brands', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Brand', exact: true })).toHaveCount(0);
    await expect(page.getByTitle('Edit Brand')).toHaveCount(0);
    await expect(page.getByTitle('Delete Brand')).toHaveCount(0);
  });

  test('ADMIN product list shows mutation controls', async ({ page }) => {
    await loginAs(page, 'ADMIN');

    await page.goto('/products');

    await expect(page.getByRole('link', { name: 'Add Product', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bulk Import', exact: true })).toBeVisible();
    await expect(page.getByTitle('Edit Product').first()).toBeVisible();
    await expect(page.getByTitle('Deactivate Product').first()).toBeVisible();
  });
});
