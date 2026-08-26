const { test, expect } = require('@playwright/test');

const credentials = {
  ADMIN: { username: 'qaadmin', password: 'Password@123' },
  MANAGER: { username: 'qamanager', password: 'Password@123' },
};

async function loginAs(page, role) {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill(credentials[role].username);
  await page.locator('input[name="password"]').fill(credentials[role].password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 25000 });
}

test.describe('Frontend Reports E2E Suite', () => {
  test('POS-REP-E2E-01 Admin can navigate to Reports page and view financial tabs', async ({ page }) => {
    await loginAs(page, 'ADMIN');

    // Click on Reports link in sidebar
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await page.waitForURL(/\/reports$/, { timeout: 15000 });

    // Verify page title and header
    await expect(page.getByRole('heading', { name: 'Financial & Operational Reports' })).toBeVisible();

    // Verify all 6 tabs exist
    await expect(page.getByRole('button', { name: 'Sales Summary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Customer Outstanding' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Distributor Outstanding' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Payment Summary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Purchase Summary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inventory Summary' })).toBeVisible();

    // Verify default view (Sales Summary) shows summary cards
    await expect(page.getByText('Total Sales Value')).toBeVisible();

    // Switch to Customer Outstanding tab
    await page.getByRole('button', { name: 'Customer Outstanding' }).click();
    await expect(page.getByText('Total Receivables Outstanding')).toBeVisible();

    // Switch to Distributor Outstanding tab
    await page.getByRole('button', { name: 'Distributor Outstanding' }).click();
    await expect(page.getByText('Total Payables Outstanding')).toBeVisible();

    // Switch to Inventory Summary tab
    await page.getByRole('button', { name: 'Inventory Summary' }).click();
    await expect(page.getByText('Total Catalog Value')).toBeVisible();
  });
});
