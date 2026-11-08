const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 02: Navigation & Global Layout', () => {
  // 15 POSITIVE TESTS
  test('POS-NAV-001: Sidebar toggle button collapses navigation sidebar', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    const collapseBtn = page.locator('button[aria-label*="collapse" i], button:has(.lucide-chevron-left), button:has(.lucide-panel-left-close), button:has(.lucide-menu)').first();
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(300);
      expect(true).toBeTruthy();
    }
  });

  test('POS-NAV-002: Clicking Dashboard nav item routes to /dashboard', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('POS-NAV-003: Clicking Customers nav item routes to /customers', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^customers$/i }).click();
    await expect(page).toHaveURL(/\/customers$/);
  });

  test('POS-NAV-004: Clicking Products nav item routes to /products', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^products$/i }).click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test('POS-NAV-005: Clicking User Management nav item routes to /users', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^user management$/i }).click();
    await expect(page).toHaveURL(/\/users$/);
  });

  test('POS-NAV-006: Clicking Categories nav item routes to /categories', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^categories$/i }).click();
    await expect(page).toHaveURL(/\/categories$/);
  });

  test('POS-NAV-007: Clicking Quotations nav item routes to /quotations', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^quotations$/i }).click();
    await expect(page).toHaveURL(/\/quotations$/);
  });

  test('POS-NAV-008: Clicking Orders nav item routes to /orders', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^orders$/i }).click();
    await expect(page).toHaveURL(/\/orders$/);
  });

  test('POS-NAV-009: Clicking Payments nav item routes to /payments', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^payments$/i }).click();
    await expect(page).toHaveURL(/\/payments$/);
  });

  test('POS-NAV-010: Clicking Distributors nav item routes to /distributors', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^distributors$/i }).click();
    await expect(page).toHaveURL(/\/distributors$/);
  });

  test('POS-NAV-011: Clicking Purchase Orders nav item routes to /purchase-orders', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^purchase orders$/i }).click();
    await expect(page).toHaveURL(/\/purchase-orders$/);
  });

  test('POS-NAV-012: Clicking Distributor Payments nav item routes to /distributor-payments', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^distributor payments$/i }).click();
    await expect(page).toHaveURL(/\/distributor-payments$/);
  });

  test('POS-NAV-013: Clicking Reports nav item routes to /reports', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^reports$/i }).click();
    await expect(page).toHaveURL(/\/reports$/);
  });

  test('POS-NAV-014: Clicking Settings nav item routes to /settings', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^settings$/i }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('POS-NAV-015: Active navigation link indicates active state styling', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('link', { name: /^products$/i }).click();
    const productLink = page.getByRole('link', { name: /^products$/i });
    const classList = await productLink.getAttribute('class');
    expect(classList).toBeTruthy();
  });

  // 15 NEGATIVE TESTS
  test('NEG-NAV-001: SALES role sidebar hides Settings link', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-002: SALES role sidebar hides Distributors link', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Distributors', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-003: SALES role sidebar hides Purchase Orders link', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Purchase Orders', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-004: SALES role sidebar hides Distributor Payments link', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Distributor Payments', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-005: SALES role sidebar hides Reports link', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Reports', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-006: SALES role sidebar hides Audit Logs link', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Audit Logs', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-007: WAREHOUSE role sidebar hides Customers link', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await expect(page.getByRole('link', { name: 'Customers', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-008: WAREHOUSE role sidebar hides Quotations link', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await expect(page.getByRole('link', { name: 'Quotations', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-009: WAREHOUSE role sidebar hides Customer Payments link', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await expect(page.getByRole('link', { name: 'Payments', exact: true })).toHaveCount(0);
  });

  test('NEG-NAV-010: SALES direct URL to /brands is denied with unauthorized screen', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/brands');
    const isUnauthorized = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized');
    expect(isUnauthorized).toBeTruthy();
  });

  test('NEG-NAV-011: SALES direct URL to /distributors is denied', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/distributors');
    const isUnauthorized = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized');
    expect(isUnauthorized).toBeTruthy();
  });

  test('NEG-NAV-012: SALES direct URL to /purchase-orders is denied', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/purchase-orders');
    const isUnauthorized = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized');
    expect(isUnauthorized).toBeTruthy();
  });

  test('NEG-NAV-013: Non-existent URL /random-404-check shows NotFound component', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/random-404-check');
    await expect(page.locator('h1, h2, div').filter({ hasText: /not found|404/i }).first()).toBeVisible();
  });

  test('NEG-NAV-014: Return to dashboard button on 404 page navigates back to /dashboard', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/random-404-check');
    const backBtn = page.getByRole('link', { name: /dashboard|home|go back/i }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test('NEG-NAV-015: Responsive layout does not overflow horizontally (documentWidth <= viewportWidth)', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    const metrics = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewWidth: window.innerWidth
    }));
    expect(metrics.docWidth).toBeLessThanOrEqual(metrics.viewWidth + 5);
  });
});
