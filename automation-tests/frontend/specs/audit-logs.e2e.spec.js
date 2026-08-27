const { test, expect } = require('@playwright/test');

const credentials = {
  ADMIN: { username: 'qaadmin', password: 'Password@123' },
  MANAGER: { username: 'qamanager', password: 'Password@123' },
  SALES: { username: 'qasales', password: 'Password@123' }
};

async function loginAs(page, role) {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill(credentials[role].username);
  await page.locator('input[name="password"]').fill(credentials[role].password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 25000 });
}

test.describe('Frontend Audit Logs E2E Suite', () => {
  test('POS-AUD-E2E-01 Admin can navigate to Audit Logs page, view records and filter', async ({ page }) => {
    await loginAs(page, 'ADMIN');

    // Click on Audit Logs in sidebar
    await page.getByRole('link', { name: 'Audit Logs', exact: true }).click();
    await page.waitForURL(/\/audit-logs$/, { timeout: 15000 });

    // Verify page header
    await expect(page.getByRole('heading', { name: 'Audit Trail & System Logs' })).toBeVisible();

    // Verify filter controls exist
    await expect(page.getByPlaceholder('e.g. qaadmin...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();

    // Verify presence of table or empty message
    const tableOrEmpty = page.locator('table').or(page.getByText('No Audit Events Found'));
    await expect(tableOrEmpty.first()).toBeVisible();
  });

  test('POS-AUD-E2E-02 Manager has access to Audit Logs in sidebar', async ({ page }) => {
    await loginAs(page, 'MANAGER');

    const auditLink = page.getByRole('link', { name: 'Audit Logs', exact: true });
    await expect(auditLink).toBeVisible();
    await auditLink.click();
    await page.waitForURL(/\/audit-logs$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Audit Trail & System Logs' })).toBeVisible();
  });

  test('POS-AUD-E2E-03 Sales user has no Audit Logs link in sidebar and is blocked', async ({ page }) => {
    await loginAs(page, 'SALES');

    // Sidebar should NOT contain Audit Logs link
    const auditLink = page.getByRole('link', { name: 'Audit Logs', exact: true });
    await expect(auditLink).not.toBeVisible();

    // Direct navigation should render UnauthorizedPage
    await page.goto('/audit-logs');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  });
});
