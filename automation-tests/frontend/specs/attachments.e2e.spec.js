const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test('draft order attachment uploads with authentication and previews locally before association', async ({ page }) => {
  const login = new LoginPage(page);
  await login.navigate();
  await login.login('qaadmin', 'Password@123');
  await page.goto('/orders/new');
  const uploaded = page.waitForResponse(response =>
    response.url().includes('/api/files/upload') && response.request().method() === 'POST');
  const downloads = [];
  page.on('request', request => {
    if (request.url().includes('/api/files/download/billpads/')) downloads.push(request.url());
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: 'reference.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ZkAAAAASUVORK5CYII=', 'base64'),
  });
  const upload = await uploaded;
  expect(upload.status()).toBe(200);
  expect(upload.request().headers().authorization).toMatch(/^Bearer /);
  const image = page.getByAltText('Bill Pad');
  await expect(image).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => image.evaluate(node => node.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('link', { name: 'View uploaded reference pad' })).toHaveAttribute('href', /^blob:/);
  expect(downloads).toEqual([]);
});
