class CustomerPage {
  constructor(page) {
    this.page = page;
    this.addCustomerButton = page.locator('button:has-text("Add Customer")');
    this.nameInput = page.locator('input[name="name"]');
    this.phoneInput = page.locator('input[name="phoneNumber"]');
    this.saveButton = page.locator('button:has-text("Save")');
    this.tableRows = page.locator('table tr');
  }

  async createCustomer(name, phone) {
    await this.addCustomerButton.click();
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.saveButton.click();
  }
}

module.exports = { CustomerPage };
