const { test, expect } = require('@playwright/test');
for (const [role, username] of [['SALES', 'qasales'], ['WAREHOUSE', 'qawarehouse']]) {
  test(`${role} dashboard shows operational widgets without company financials`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Password', { exact: true }).fill(process.env[`QA_${role}_PASSWORD`]);
    const stats = page.waitForResponse(response => response.url().endsWith('/api/dashboard/stats'));
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    expect((await stats).status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Total Orders/ })).toBeVisible();
    await expect(page.getByText('Gross Revenue', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Receivables', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Payables', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Revenue Analytics' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Top Products' })).toHaveCount(0);
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: /unauthorized|access denied/i })).toBeVisible();
  });
}
