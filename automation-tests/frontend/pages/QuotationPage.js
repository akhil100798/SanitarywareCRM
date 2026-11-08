class QuotationPage {
  constructor(page) {
    this.page = page;
    this.createQuotationButton = page.locator('a:has-text("New Quotation"), a:has-text("Create Quotation"), button:has-text("New Quotation"), button:has-text("Create Quotation")');
    this.customerSelect = page.locator('select[name="customerId"]');
    this.addItemButton = page.locator('button:has-text("Add Line Item"), button:has-text("Add Item")');
    this.productPicker = page.getByRole('button', { name: 'Select Product' });
    this.productSearch = page.getByPlaceholder('Type to search name, SKU, barcode...');
    this.quantityInput = page.locator('input[name="quantity"]');
    this.saveQuotationButton = page.locator('a:has-text("Save"), button:has-text("Save")');
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
    await this.productPicker.last().click();
    if (productName) {
      await this.productSearch.fill(productName);
      await this.page.getByText(productName, { exact: true }).last().waitFor({ state: 'visible', timeout: 15000 });
      await this.page.getByText(productName, { exact: true }).last().click();
    } else {
      const firstProduct = this.page.locator('div.max-h-56 > div[class*="cursor-pointer"]').first();
      await firstProduct.waitFor({ state: 'visible', timeout: 15000 });
      await firstProduct.click();
    }
    
    await this.quantityInput.fill(quantity.toString());
    await this.saveQuotationButton.click();
    await this.page.locator('h1:has-text("Sales Quotations")').waitFor({ state: 'visible', timeout: 15000 });
    await this.page.locator('span:has-text("Fetching quotations...")').waitFor({ state: 'detached', timeout: 35000 });
  }
}

module.exports = { QuotationPage };
