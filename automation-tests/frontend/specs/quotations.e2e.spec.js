const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { QuotationPage } = require('../pages/QuotationPage');

test.describe('Frontend Quotations E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');
  });

  test('POS-047 Create quotation draft', async ({ page }) => {
    await page.goto('/quotations');
    await page.locator('span:has-text("Fetching quotations...")').waitFor({ state: 'detached', timeout: 35000 });
    const quotationPage = new QuotationPage(page);
    await quotationPage.createQuotation('Ramesh Sharma', 'E2E Automated Pipe', 5);
    await page.fill('input[placeholder*="Search"]', 'Ramesh Sharma');
    await page.keyboard.press('Enter');
    await expect(page.locator('table tr:has-text("Ramesh Sharma")').first()).toBeVisible();
  });

  test('POS-048 Download quotation PDF', async ({ page }) => {
    await page.goto('/quotations');
    await page.locator('span:has-text("Fetching quotations...")').waitFor({ state: 'detached', timeout: 35000 });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('table tr button[title="Download PDF"]').first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('POS-049 Accept quotation and verify tag updates', async ({ page }) => {
    await page.goto('/quotations');
    await page.locator('span:has-text("Fetching quotations...")').waitFor({ state: 'detached', timeout: 35000 });
    const targetRow = page.locator('table tr').filter({ has: page.locator('button[title="Mark Accepted"]') }).first();
    const rawQuoteNum = await targetRow.locator('td').first().innerText();
    const cleanQuoteNum = rawQuoteNum.split('\n')[0].trim();
    await targetRow.locator('button[title="Mark Accepted"]').click();
    const updatedRow = page.locator('table tr').filter({ hasText: cleanQuoteNum });
    await expect(updatedRow).toContainText('ACCEPTED');
  });
});
