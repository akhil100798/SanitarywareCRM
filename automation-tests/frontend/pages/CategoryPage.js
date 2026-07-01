class CategoryPage {
  constructor(page) {
    this.page = page;
    this.addCategoryButton = page.locator('button:has-text("Add Category")');
    this.nameInput = page.locator('input[name="name"]');
    this.descriptionInput = page.locator('textarea[name="description"]');
    this.parentDropdown = page.locator('select[name="parentId"]');
    this.saveButton = page.locator('button:has-text("Save")');
    this.tableRows = page.locator('table tr');
  }

  async createCategory(name, description, parentName = null) {
    await this.addCategoryButton.click();
    await this.nameInput.fill(name);
    if (description) await this.descriptionInput.fill(description);
    if (parentName) await this.parentDropdown.selectOption({ label: parentName });
    await this.saveButton.click();
  }
}

module.exports = { CategoryPage };
