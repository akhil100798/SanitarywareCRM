class ProductPage {
  constructor(page) {
    this.page = page;
    this.addProductButton = page.locator('a:has-text("Add Product"), button:has-text("Add Product")');
    this.categoriesButton = page.locator('main a:has-text("Categories"), main button:has-text("Categories")');
    this.skuInput = page.locator('input[name="sku"]');
    this.nameInput = page.locator('input[name="name"]');
    this.mrpInput = page.locator('input[name="mrp"]');
    this.priceInput = page.locator('input[name="sellingPrice"]');
    this.stockInput = page.locator('input[name="stockQuantity"]');
    this.categorySelect = page.locator('select[name="categoryId"]');
    this.brandSelect = page.locator('select[name="brandId"]');
    this.saveButton = page.locator('button:has-text("Save Product"), button[type="submit"]');
  }

  async createProduct(sku, name, price, stock) {
    await this.addProductButton.click();
    await this.page.waitForURL(url => url.pathname.includes('/products/new'));
    await this.page.waitForTimeout(500);
    await this.skuInput.fill(sku);
    await this.nameInput.fill(name);
    
    // Wait for dropdown options to load from API
    await this.page.locator('select[name="categoryId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });
    await this.page.locator('select[name="brandId"] option:not([value=""])').first().waitFor({ state: 'attached', timeout: 10000 });

    await this.categorySelect.selectOption({ index: 1 });
    await this.brandSelect.selectOption({ index: 1 });

    await this.mrpInput.fill(price.toString());
    await this.priceInput.fill(price.toString());
    await this.stockInput.fill(stock.toString());
    await this.saveButton.click();
    await this.page.locator('h1:has-text("Product Catalog")').waitFor({ state: 'visible', timeout: 15000 });
    await this.page.locator('td:has-text("Fetching catalog list...")').waitFor({ state: 'detached', timeout: 35000 });
  }
}

module.exports = { ProductPage };
