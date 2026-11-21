const { chromium } = require('@playwright/test');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost/login');
  await page.fill('input[type="text"], input[name="username"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});

  // Go to Products
  await page.goto('http://localhost/products');
  await page.waitForTimeout(2000);

  // Search for Johnson SKU
  await page.fill('input[placeholder*="Search by name"]', 'L0146PGM');
  await page.click('button:has-text("Search")');
  await page.waitForTimeout(2500);

  // Screenshot filtered product
  await page.screenshot({ path: 'automation-tests/johnson-product-card.png' });
  console.log('✓ Johnson product card screenshot saved to automation-tests/johnson-product-card.png');

  // Clear search and filter by brand
  await page.fill('input[placeholder*="Search by name"]', '');
  await page.selectOption('select:has-text("All Brands")', { label: 'jhonson' }).catch(async () => {
    // try finding the brand select
    const selects = await page.$$('select');
    for (const sel of selects) {
      const text = await sel.innerText();
      if (text.includes('jhonson') || text.includes('Johnson')) {
        await sel.selectOption({ label: 'jhonson' });
        break;
      }
    }
  });
  await page.click('button:has-text("Search")');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'automation-tests/johnson-products-list.png' });
  console.log('✓ Johnson products list screenshot saved to automation-tests/johnson-products-list.png');

  await browser.close();
}

main().catch(console.error);
