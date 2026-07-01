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
    const quotationPage = new QuotationPage(page);
    await quotationPage.createQuotation('Ramesh Sharma', 'E2E Automated Pipe', 5);
    await expect(quotationPage.tableRows.first()).toContainText('Ramesh Sharma');
  });

  test('POS-048 Download quotation PDF', async ({ page }) => {
    await page.goto('/quotations');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('table tr button.btn-download-pdf').first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('POS-049 Accept quotation and verify tag updates', async ({ page }) => {
    await page.goto('/quotations');
    const quoteRow = page.locator('table tr:has-text("Ramesh Sharma")').first();
    await quoteRow.locator('button.btn-accept').click();
    await expect(quoteRow.locator('.badge')).toContainText('ACCEPTED');
  });
});
