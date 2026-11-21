const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  // 1. Authenticate
  const loginRes = await fetch('http://localhost:8081/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();

  // 2. Upload image to Product 88 (E8306UI1865)
  // Create an attractive 64x64 PNG buffer
  // We can use a base64 encoded blue ceramic fixture icon
  const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC0SURBVHhe7dsxDcAwDAPBMy1bMrr3GqC4gC117e+c1jPnvPv+kZzknu29vTfc18k+wL0/OQEAAICSAwAAgJIDAACAEgMAAICSAwAAgJIDAACAEgMAAICSAwAAgJIDAACAEgMAAICSAwAAgJIDAACAEgMAAICSAwAAgJIDAACAEgMAAICSAwAAgJIDAACAEgMAAICSAwAAgJIDAACAEgMAAICSAwAAgJIDAACAEgMAAICSAwAAgJIDAPg1V47wD1eK1sS1AAAAAElFTkSuQmCC';
  const imgBuffer = Buffer.from(iconBase64, 'base64');
  
  const form = new FormData();
  form.append('file', new Blob([imgBuffer], { type: 'image/png' }), 'seat_cover_preview.png');
  form.append('isPrimary', 'true');
  form.append('displayOrder', '1');

  const uploadRes = await fetch('http://localhost:8081/api/products/88/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  console.log('Product 88 Image Upload status:', uploadRes.status);
  const imgData = await uploadRes.json();
  console.log('Uploaded image data:', imgData);

  // 3. Launch browser and view product catalog
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost/login');
  await page.fill('input[type="text"], input[name="username"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  await page.goto('http://localhost/products');
  await page.waitForTimeout(2000);

  // Search for E8306
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  await searchInput.fill('E8306UI1865');
  await page.waitForTimeout(1500);

  const screenshotPath = path.resolve('docs/qa-screenshots/13_web_product_catalog_with_image.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved screenshot:', screenshotPath);

  await browser.close();
})();
