class CategoryPage {
  constructor(page) {
    this.page = page;
    this.addCategoryButton = page.getByRole('button', { name: 'Add Category', exact: true }).first();
    this.nameInput = page.locator('input[name="name"]');
    this.descriptionInput = page.locator('textarea[name="description"]');
    this.parentDropdown = page.locator('select[name="parentId"]');
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true }).first();
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
