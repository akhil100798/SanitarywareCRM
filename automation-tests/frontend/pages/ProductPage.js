class ProductPage {
  constructor(page) {
    this.page = page;
    this.addProductButton = page.locator('button:has-text("Add Product")');
    this.categoriesButton = page.locator('button:has-text("Categories")');
    this.skuInput = page.locator('input[name="sku"]');
    this.nameInput = page.locator('input[name="name"]');
    this.priceInput = page.locator('input[name="sellingPrice"]');
    this.stockInput = page.locator('input[name="stockQuantity"]');
    this.saveButton = page.locator('button:has-text("Save")');
    this.tableRows = page.locator('table tr');
  }

  async createProduct(sku, name, price, stock) {
    await this.addProductButton.click();
    await this.skuInput.fill(sku);
    await this.nameInput.fill(name);
    await this.priceInput.fill(price.toString());
    await this.stockInput.fill(stock.toString());
    await this.saveButton.click();
  }
}

module.exports = { ProductPage };
