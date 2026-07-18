class CustomerPage {
  constructor(page) {
    this.page = page;
    this.addCustomerButton = page.locator('a:has-text("Add Customer"), button:has-text("Add Customer")');
    this.nameInput = page.locator('input[name="name"]');
    this.phoneInput = page.locator('input[name="phoneNumber"]');
    this.emailInput = page.locator('input[name="email"]');
    this.saveButton = page.locator('a:has-text("Save"), button:has-text("Save")');
    this.tableRows = page.locator('table tbody tr');
  }

  async createCustomer(name, phone) {
    await this.addCustomerButton.click();
    await this.page.waitForURL(url => url.pathname.includes('/customers/new'));
    await this.page.waitForTimeout(500);
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.emailInput.fill(`cust-${Date.now()}@test.com`);
    await this.saveButton.click();
    await this.page.locator('h1:has-text("Customer Directory")').waitFor({ state: 'visible', timeout: 15000 });
    await this.page.locator('span:has-text("Fetching customer list...")').waitFor({ state: 'detached', timeout: 35000 });
  }
}

module.exports = { CustomerPage };
