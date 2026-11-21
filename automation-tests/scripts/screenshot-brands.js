const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost/login');
  await page.fill('input[type="text"], input[name="username"]', 'admin');
  await page.fill('input[type="password"], input[name="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign in")');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost/brands');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/qa-evidence/08_web_brands_catalog_uploaded.png', fullPage: true });
  await browser.close();
  console.log('Screenshot saved to docs/qa-evidence/08_web_brands_catalog_uploaded.png');
})();
