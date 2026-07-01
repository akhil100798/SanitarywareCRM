class QuotationPage {
  constructor(page) {
    this.page = page;
    this.createQuotationButton = page.locator('button:has-text("Create Quotation")');
    this.customerSelect = page.locator('select[name="customerId"]');
    this.addItemButton = page.locator('button:has-text("Add Item")');
    this.productSelect = page.locator('select[name="productId"]');
    this.quantityInput = page.locator('input[name="quantity"]');
    this.saveQuotationButton = page.locator('button:has-text("Save Quotation")');
    this.tableRows = page.locator('table tr');
  }

  async createQuotation(customerName, productName, quantity) {
    await this.createQuotationButton.click();
    await this.customerSelect.selectOption({ label: customerName });
    await this.addItemButton.click();
    await this.productSelect.selectOption({ label: productName });
    await this.quantityInput.fill(quantity.toString());
    await this.saveQuotationButton.click();
  }
}

module.exports = { QuotationPage };
