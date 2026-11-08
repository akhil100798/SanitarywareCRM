const { test, expect } = require('@playwright/test');

const viewports = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

test.describe('Responsive Viewports Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="username"]').fill('qaadmin');
    await page.locator('input[name="password"]').fill('Password@123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 25000 });
  });

  for (const viewport of viewports) {
    test(`responsive layout at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const route of ['/dashboard', '/products', '/settings']) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.locator('main').waitFor({ state: 'visible', timeout: 15000 });
        const metrics = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          bodyWidth: document.body.scrollWidth,
          documentWidth: document.documentElement.scrollWidth,
        }));
        console.log(`RESPONSIVE ${viewport.width}x${viewport.height} ${route} ${JSON.stringify(metrics)}`);
        expect(metrics.bodyWidth, `${route} body overflow at ${viewport.width}px`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
        expect(metrics.documentWidth, `${route} document overflow at ${viewport.width}px`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      }
    });
  }
});
