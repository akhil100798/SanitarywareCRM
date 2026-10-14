class QuotationPage {
  constructor(page) {
    this.page = page;
    this.createQuotationButton = page.getByRole('link', { name: 'New Quotation', exact: true }).first();
    this.customerSelect = page.locator('select[name="customerId"]');
    this.addItemButton = page.getByRole('button', { name: 'Add Line Item', exact: true });
    this.productSelect = page.getByRole('button', { name: 'Select Product', exact: true });
    this.quantityInput = page.locator('table input[type="number"]').first();
    this.saveQuotationButton = page.getByRole('button', { name: 'Save Quotation', exact: true });
    this.tableRows = page.locator('table tbody tr');
  }

  async createQuotation(customerName, productName, quantity) {
    await this.createQuotationButton.click();
    await this.page.waitForURL(url => url.pathname.includes('/quotations/new'));
    
    // Wait for customer and product dropdowns to be populated
    if (customerName) {
      const option = this.page.locator('select[name="customerId"] option').filter({ hasText: customerName }).first();
      await option.waitFor({ state: 'attached', timeout: 15000 });
      const value = await option.getAttribute('value');
      await this.customerSelect.selectOption(value);
    } else {
      await this.page.locator('select[name="customerId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 15000 });
      await this.customerSelect.selectOption({ index: 1 });
    }
    
    await this.addItemButton.click();
    if (productName) {
      await this.productSelect.click();
      await this.page.getByTestId('product-search-input').fill(productName);
      const result = this.page.locator('[data-testid^="product-search-result-"]').filter({ hasText: productName }).first();
      await result.waitFor({ state: 'visible', timeout: 15000 });
      await result.click();
    } else {
      await this.productSelect.click();
      await this.page.locator('.cursor-pointer').first().click();
    }
    
    await this.quantityInput.fill(quantity.toString());
    await this.saveQuotationButton.click();
    await this.page.locator('h1:has-text("Sales Quotations")').waitFor({ state: 'visible', timeout: 15000 });
    await this.page.locator('span:has-text("Fetching quotations...")').waitFor({ state: 'detached', timeout: 35000 });
  }
}

module.exports = { QuotationPage };
