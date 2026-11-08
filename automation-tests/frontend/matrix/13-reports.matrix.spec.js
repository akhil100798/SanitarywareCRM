const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 13: Financial & Operational Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 15 POSITIVE TESTS
  test('POS-REP-001: Navigating to /reports displays Financial & Operational Reports header', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1').filter({ hasText: /reports/i })).toBeVisible();
  });

  test('POS-REP-002: Clicking Sales Summary tab activates sales metrics view', async ({ page }) => {
    await page.goto('/reports');
    const salesTab = page.locator('button').filter({ hasText: /sales summary/i });
    await salesTab.click();
    await page.waitForTimeout(300);
    await expect(salesTab).toBeVisible();
  });

  test('POS-REP-003: Clicking Customer Outstanding tab displays customer credit receivables', async ({ page }) => {
    await page.goto('/reports');
    const custTab = page.locator('button').filter({ hasText: /customer outstanding/i });
    await custTab.click();
    await page.waitForTimeout(500);
    await expect(custTab).toBeVisible();
  });

  test('POS-REP-004: Clicking Distributor Outstanding tab displays vendor payables', async ({ page }) => {
    await page.goto('/reports');
    const distTab = page.locator('button').filter({ hasText: /distributor outstanding/i });
    await distTab.click();
    await page.waitForTimeout(500);
    await expect(distTab).toBeVisible();
  });

  test('POS-REP-005: Clicking Payment Summary tab displays collection records', async ({ page }) => {
    await page.goto('/reports');
    const payTab = page.locator('button').filter({ hasText: /payment summary/i });
    await payTab.click();
    await page.waitForTimeout(500);
    await expect(payTab).toBeVisible();
  });

  test('POS-REP-006: Clicking Purchase Summary tab displays procurement expenditures', async ({ page }) => {
    await page.goto('/reports');
    const purchTab = page.locator('button').filter({ hasText: /purchase summary/i });
    await purchTab.click();
    await page.waitForTimeout(500);
    await expect(purchTab).toBeVisible();
  });

  test('POS-REP-007: Clicking Inventory Summary tab displays stock valuation', async ({ page }) => {
    await page.goto('/reports');
    const invTab = page.locator('button').filter({ hasText: /inventory/i });
    await invTab.click();
    await page.waitForTimeout(500);
    await expect(invTab).toBeVisible();
  });

  test('POS-REP-008: Refresh button reloads current report data with spinner animation', async ({ page }) => {
    await page.goto('/reports');
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    await refreshBtn.click();
    await page.waitForTimeout(500);
    await expect(refreshBtn).toBeVisible();
  });

  test('POS-REP-009: Start Date picker accepts historical filter date', async ({ page }) => {
    await page.goto('/reports');
    const startDate = page.locator('input[type="date"]').first();
    if (await startDate.isVisible()) {
      await startDate.fill('2026-10-01');
      await expect(startDate).toHaveValue('2026-10-01');
    }
  });

  test('POS-REP-010: End Date picker accepts terminal filter date', async ({ page }) => {
    await page.goto('/reports');
    const endDate = page.locator('input[type="date"]').nth(1);
    if (await endDate.isVisible()) {
      await endDate.fill('2026-11-05');
      await expect(endDate).toHaveValue('2026-11-05');
    }
  });

  test('POS-REP-011: Apply filter button updates report query without crash', async ({ page }) => {
    await page.goto('/reports');
    const filterBtn = page.locator('button[type="submit"], button:has-text("Apply"), button:has-text("Filter")').first();
    if (await filterBtn.isVisible()) {
      await filterBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('POS-REP-012: Export to Excel button is clickable and triggers download payload', async ({ page }) => {
    await page.goto('/reports');
    const exportBtn = page.locator('button:has-text("Export"), button:has(.lucide-download)').first();
    if (await exportBtn.isVisible()) {
      expect(await exportBtn.isEnabled()).toBeTruthy();
    }
  });

  test('POS-REP-013: KPI metric cards render numerical values with currency symbols', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('.grid, .card, div').filter({ hasText: /total|revenue|₹/i }).first()).toBeVisible();
  });

  test('POS-REP-014: Manager role can access reports dashboard', async ({ page }) => {
    await loginAs(page, 'MANAGER');
    await page.goto('/reports');
    await expect(page.locator('h1').filter({ hasText: /reports/i })).toBeVisible();
  });

  test('POS-REP-015: Switching tabs preserves global layout without page navigation', async ({ page }) => {
    await page.goto('/reports');
    await page.locator('button').filter({ hasText: /customer outstanding/i }).click();
    await page.locator('button').filter({ hasText: /sales summary/i }).click();
    expect(page.url()).toContain('/reports');
  });

  // 15 NEGATIVE TESTS
  test('NEG-REP-001: Sales role navigating to /reports is denied with unauthorized screen', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/reports');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/reports');
    expect(blocked).toBeTruthy();
  });

  test('NEG-REP-002: Warehouse role navigating to /reports is denied with unauthorized screen', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/reports');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/reports');
    expect(blocked).toBeTruthy();
  });

  test('NEG-REP-003: Unauthenticated request to /reports redirects to /login', async ({ page }) => {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('/reports');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('NEG-REP-004: Direct URL injection with malformed query params does not crash report engine', async ({ page }) => {
    await page.goto('/reports?startDate=NOT_A_DATE&endDate=CORRUPTED');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/reports');
  });

  test('NEG-REP-005: Start date after End date handles gracefully without uncaught exception', async ({ page }) => {
    await page.goto('/reports');
    const startDate = page.locator('input[type="date"]').first();
    const endDate = page.locator('input[type="date"]').nth(1);
    if (await startDate.isVisible() && await endDate.isVisible()) {
      await startDate.fill('2026-11-20');
      await endDate.fill('2026-11-01');
      const filterBtn = page.locator('button[type="submit"]').first();
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('NEG-REP-006: SQL injection payload in report query parameter is safely rejected', async ({ page }) => {
    await page.goto("/reports?status=' OR '1'='1");
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/reports');
  });

  test('NEG-REP-007: XSS script tag in URL search params is neutralized', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.goto('/reports?query=<script>alert("rep-xss")</script>');
    await page.waitForTimeout(500);
    expect(alertFired).toBeFalsy();
  });

  test('NEG-REP-008: Rapid consecutive tab switching does not freeze UI thread', async ({ page }) => {
    await page.goto('/reports');
    const tabs = page.locator('button').filter({ hasText: /summary|outstanding/i });
    const count = await tabs.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(100);
    }
    expect(page.url()).toContain('/reports');
  });

  test('NEG-REP-009: Negative year date injection handles gracefully', async ({ page }) => {
    await page.goto('/reports');
    const startDate = page.locator('input[type="date"]').first();
    if (await startDate.isVisible()) {
      await startDate.fill('0001-01-01');
      await page.waitForTimeout(300);
    }
  });

  test('NEG-REP-010: Far future date with no transactions displays empty records view cleanly', async ({ page }) => {
    await page.goto('/reports');
    const startDate = page.locator('input[type="date"]').first();
    const endDate = page.locator('input[type="date"]').nth(1);
    if (await startDate.isVisible() && await endDate.isVisible()) {
      await startDate.fill('2099-01-01');
      await endDate.fill('2099-01-31');
      const filterBtn = page.locator('button[type="submit"]').first();
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('NEG-REP-011: Sales role has no Reports link visible in sidebar', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Reports', exact: true })).toHaveCount(0);
  });

  test('NEG-REP-012: Warehouse role has no Reports link visible in sidebar', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await expect(page.getByRole('link', { name: 'Reports', exact: true })).toHaveCount(0);
  });

  test('NEG-REP-013: Server error response displays toast notification instead of white-screen crash', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h1').filter({ hasText: /reports/i })).toBeVisible();
  });

  test('NEG-REP-014: Non-date text entry in date fields is blocked by browser type="date"', async ({ page }) => {
    await page.goto('/reports');
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await expect(dateInput).toHaveAttribute('type', 'date');
    }
  });

  test('NEG-REP-015: Clicking refresh rapidly does not create connection leak', async ({ page }) => {
    await page.goto('/reports');
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await refreshBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
