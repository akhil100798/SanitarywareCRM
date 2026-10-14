const { test, expect } = require('@playwright/test');

const credentials = {
  ADMIN: { username: 'qaadmin', password: process.env.QA_ADMIN_PASSWORD },
  MANAGER: { username: 'qamanager', password: process.env.QA_MANAGER_PASSWORD },
};

async function loginAs(page, role) {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill(credentials[role].username);
  await page.locator('input[name="password"]').fill(credentials[role].password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 25000 });
}

test.describe('Frontend Reports E2E Suite', () => {
  test('report tabs support keyboard selection and date labels', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    const sales = page.getByRole('tab', { name: 'Sales Summary', exact: true });
    await expect(sales).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Start Date', { exact: true })).toBeVisible();
    await expect(page.getByLabel('End Date', { exact: true })).toBeVisible();
    await sales.focus();
    await sales.press('ArrowRight');
    const customer = page.getByRole('tab', { name: 'Customer Outstanding', exact: true });
    await expect(customer).toBeFocused();
    await expect(customer).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', await customer.getAttribute('id'));
    await customer.press('End');
    await expect(page.getByRole('tab', { name: 'Inventory Summary', exact: true })).toBeFocused();
    await page.getByRole('tab', { name: 'Inventory Summary', exact: true }).press('Home');
    await expect(sales).toBeFocused();
    await expect(sales).toHaveAttribute('aria-selected', 'true');
  });
  test('POS-REP-E2E-01 Admin can navigate to Reports page and view financial tabs', async ({ page }) => {
    await loginAs(page, 'ADMIN');

    // Click on Reports link in sidebar
    await page.getByRole('link', { name: 'Reports', exact: true }).click();
    await page.waitForURL(/\/reports$/, { timeout: 15000 });

    // Verify page title and header
    await expect(page.getByRole('heading', { name: 'Financial & Operational Reports' })).toBeVisible();

    // Verify all 6 tabs exist
    await expect(page.getByRole('tab', { name: 'Sales Summary' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Customer Outstanding' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Distributor Outstanding' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Payment Summary' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Purchase Summary' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Inventory Summary' })).toBeVisible();

    // Verify default view (Sales Summary) shows summary cards
    await expect(page.getByText('Total Sales Value')).toBeVisible();

    // Switch to Customer Outstanding tab
    await page.getByRole('tab', { name: 'Customer Outstanding' }).click();
    await expect(page.getByText('Total Receivables Outstanding')).toBeVisible();

    // Switch to Distributor Outstanding tab
    await page.getByRole('tab', { name: 'Distributor Outstanding' }).click();
    await expect(page.getByText('Total Payables Outstanding')).toBeVisible();

    // Switch to Inventory Summary tab
    await page.getByRole('tab', { name: 'Inventory Summary' }).click();
    await expect(page.getByText('Total Catalog Value')).toBeVisible();
  });
});
