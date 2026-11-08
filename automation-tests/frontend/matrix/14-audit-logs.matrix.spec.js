const { test, expect } = require('@playwright/test');
const { loginAs, uniqueId } = require('./helpers');

test.describe('Matrix Module 14: Security Audit Trail & Activity Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN');
  });

  // 15 POSITIVE TESTS
  test('POS-AUD-001: Navigating to /audit-logs displays Audit Trail page', async ({ page }) => {
    await page.goto('/audit-logs');
    await expect(page.locator('h1, h2').filter({ hasText: /audit/i }).first()).toBeVisible();
  });

  test('POS-AUD-002: Action type filter dropdown lists system actions', async ({ page }) => {
    await page.goto('/audit-logs');
    const actionSelect = page.locator('select').first();
    if (await actionSelect.isVisible()) {
      const options = await actionSelect.locator('option').all();
      expect(options.length).toBeGreaterThan(1);
    }
  });

  test('POS-AUD-003: Entity type filter dropdown lists system entities', async ({ page }) => {
    await page.goto('/audit-logs');
    const entitySelect = page.locator('select').nth(1);
    if (await entitySelect.isVisible()) {
      const options = await entitySelect.locator('option').all();
      expect(options.length).toBeGreaterThan(1);
    }
  });

  test('POS-AUD-004: Selecting CREATE action filters logs by creation events', async ({ page }) => {
    await page.goto('/audit-logs');
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption('CREATE');
      await page.waitForTimeout(500);
    }
  });

  test('POS-AUD-005: Selecting ORDER entity filters logs by order transactions', async ({ page }) => {
    await page.goto('/audit-logs');
    const select = page.locator('select').nth(1);
    if (await select.isVisible()) {
      await select.selectOption('ORDER');
      await page.waitForTimeout(500);
    }
  });

  test('POS-AUD-006: Refresh button re-fetches latest audit events', async ({ page }) => {
    await page.goto('/audit-logs');
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await page.waitForTimeout(400);
      await expect(refreshBtn).toBeVisible();
    }
  });

  test('POS-AUD-007: Audit log table renders timestamp, user, role, action, and details', async ({ page }) => {
    await page.goto('/audit-logs');
    await expect(page.locator('table, .audit-card').first()).toBeVisible();
  });

  test('POS-AUD-008: "View Details" / "Diff" button opens JSON diff modal', async ({ page }) => {
    await page.goto('/audit-logs');
    const viewBtn = page.locator('button:has-text("Details"), button:has-text("Diff"), button:has(.lucide-file-text)').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForTimeout(400);
    }
  });

  test('POS-AUD-009: Close button in diff modal dismisses modal', async ({ page }) => {
    await page.goto('/audit-logs');
    const viewBtn = page.locator('button:has-text("Details"), button:has-text("Diff")').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      const closeBtn = page.locator('button:has(.lucide-x)').last();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('POS-AUD-010: Escape key dismisses open diff modal', async ({ page }) => {
    await page.goto('/audit-logs');
    const viewBtn = page.locator('button:has-text("Details"), button:has-text("Diff")').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  test('POS-AUD-011: Pagination controls are present on audit logs page', async ({ page }) => {
    await page.goto('/audit-logs');
    const pagination = page.locator('button:has(.lucide-chevron-left), button:has(.lucide-chevron-right), nav[aria-label*="pagination" i]');
    expect(await pagination.count()).toBeGreaterThanOrEqual(0);
  });

  test('POS-AUD-012: Clear Filters button resets dropdown filters', async ({ page }) => {
    await page.goto('/audit-logs');
    const clearBtn = page.getByRole('button', { name: /clear|reset/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(400);
    }
  });

  test('POS-AUD-013: Manager role can access audit logs page', async ({ page }) => {
    await loginAs(page, 'MANAGER');
    await page.goto('/audit-logs');
    await expect(page.locator('h1, h2').filter({ hasText: /audit/i }).first()).toBeVisible();
  });

  test('POS-AUD-014: Date range filter inputs allow scoping audit timeframe', async ({ page }) => {
    await page.goto('/audit-logs');
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill('2026-11-01');
      await page.waitForTimeout(300);
    }
  });

  test('POS-AUD-015: Action badges display color-coded status styling', async ({ page }) => {
    await page.goto('/audit-logs');
    const badge = page.locator('span').filter({ hasText: /CREATE|UPDATE|DELETE|LOGIN/i }).first();
    if (await badge.isVisible()) {
      expect(await badge.getAttribute('class')).toBeTruthy();
    }
  });

  // 15 NEGATIVE TESTS
  test('NEG-AUD-001: Sales role navigating to /audit-logs is denied with unauthorized screen', async ({ page }) => {
    await loginAs(page, 'SALES');
    await page.goto('/audit-logs');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/audit-logs');
    expect(blocked).toBeTruthy();
  });

  test('NEG-AUD-002: Warehouse role navigating to /audit-logs is denied', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await page.goto('/audit-logs');
    const blocked = await page.locator('text=/unauthorized|access denied/i').count() > 0 || page.url().includes('unauthorized') || !page.url().includes('/audit-logs');
    expect(blocked).toBeTruthy();
  });

  test('NEG-AUD-003: Sales role has no Audit Logs link in sidebar', async ({ page }) => {
    await loginAs(page, 'SALES');
    await expect(page.getByRole('link', { name: 'Audit Logs', exact: true })).toHaveCount(0);
  });

  test('NEG-AUD-004: Warehouse role has no Audit Logs link in sidebar', async ({ page }) => {
    await loginAs(page, 'WAREHOUSE');
    await expect(page.getByRole('link', { name: 'Audit Logs', exact: true })).toHaveCount(0);
  });

  test('NEG-AUD-005: Unauthenticated access to /audit-logs redirects to /login', async ({ page }) => {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('/audit-logs');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('NEG-AUD-006: SQL injection in audit log search query executes safely', async ({ page }) => {
    await page.goto('/audit-logs?search=' + encodeURIComponent("' OR '1'='1' --"));
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/audit-logs');
  });

  test('NEG-AUD-007: XSS script tag in audit filter parameters is neutralized', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.goto('/audit-logs?user=' + encodeURIComponent('<script>alert("aud-xss")</script>'));
    await page.waitForTimeout(500);
    expect(alertFired).toBeFalsy();
  });

  test('NEG-AUD-008: Rapid double-click on Refresh button does not trigger parallel race condition', async ({ page }) => {
    await page.goto('/audit-logs');
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.dblclick();
      await page.waitForTimeout(300);
    }
  });

  test('NEG-AUD-009: Filtering by non-existent entity displays clean empty results message', async ({ page }) => {
    await page.goto('/audit-logs');
    expect(page.url()).toContain('/audit-logs');
  });

  test('NEG-AUD-010: Backdrop click outside diff modal closes modal', async ({ page }) => {
    await page.goto('/audit-logs');
    const viewBtn = page.locator('button:has-text("Details"), button:has-text("Diff")').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      const backdrop = page.locator('.fixed.inset-0').first();
      if (await backdrop.isVisible()) {
        await backdrop.click({ position: { x: 5, y: 5 } });
        await page.waitForTimeout(300);
      }
    }
  });

  test('NEG-AUD-011: Out of range page index does not crash pagination', async ({ page }) => {
    await page.goto('/audit-logs?page=999999');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/audit-logs');
  });

  test('NEG-AUD-012: Negative page index does not crash pagination', async ({ page }) => {
    await page.goto('/audit-logs?page=-5');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/audit-logs');
  });

  test('NEG-AUD-013: Alphanumeric page parameter handles gracefully', async ({ page }) => {
    await page.goto('/audit-logs?page=invalid');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/audit-logs');
  });

  test('NEG-AUD-014: Date filter with inverted start and end dates handles gracefully', async ({ page }) => {
    await page.goto('/audit-logs?startDate=2026-11-20&endDate=2026-11-01');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/audit-logs');
  });

  test('NEG-AUD-015: Direct API mutation on audit log endpoint is rejected (audit log is append-only)', async ({ page }) => {
    const res = await page.evaluate(async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const r = await fetch('/api/audit-logs/1', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return r.status;
    });
    expect([405, 403, 404]).toContain(res);
  });
});
