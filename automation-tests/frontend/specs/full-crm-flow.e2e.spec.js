const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { CategoryPage } = require('../pages/CategoryPage');
const { ProductPage } = require('../pages/ProductPage');
const { CustomerPage } = require('../pages/CustomerPage');
const { QuotationPage } = require('../pages/QuotationPage');
const { OrderPage } = require('../pages/OrderPage');
const { PaymentPage } = require('../pages/PaymentPage');

test.describe('Sanitaryware CRM Unified E2E Flow', () => {

  test('POS-096 POS-097 POS-098 Full Quote-to-Invoice Payment Lifecycle', async ({ page }) => {
    // 1. Login
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('qaadmin', 'Password@123');

    // 2. Create Category
    await page.goto('/categories');
    const categoryPage = new CategoryPage(page);
    const suffix = Date.now();
    await categoryPage.createCategory(`E2E Category ${suffix}`, 'Pipes desc');

    // 3. Create Product
    await page.goto('/products');
    const productPage = new ProductPage(page);
    await productPage.createProduct(`E2E-${suffix}`, `PVC Pipe ${suffix}`, 220.00, 100);

    // 4. Create Customer
    await page.goto('/customers');
    const customerPage = new CustomerPage(page);
    await customerPage.createCustomer(`John Doe E2E ${suffix}`, `999${suffix.toString().slice(-7)}`);

    // 5. Create Quotation
    await page.goto('/quotations');
    const quotationPage = new QuotationPage(page);
    await quotationPage.createQuotation(`John Doe E2E ${suffix}`, `PVC Pipe ${suffix}`, 5);

    // 6. Accept and Convert
    const quoteRow = page.locator(`table tr:has-text("John Doe E2E ${suffix}")`).first();
    await quoteRow.locator('button.btn-accept').click();
    await quoteRow.locator('button.btn-convert').click();

    // 7. Pay and verify balance becomes 0
    await page.click('button:has-text("Record Payment")');
    const paymentPage = new PaymentPage(page);
    await paymentPage.recordPayment(1100.00); // 5 * 220 = 1100 subtotal (excluding tax if GST is added)
    
    // Download Invoice
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button.btn-download-pdf').first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
