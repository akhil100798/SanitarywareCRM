class DistributorPage {
  constructor(page) {
    this.page = page;
    this.addDistributorButton = page.locator('a:has-text("Add Distributor"), button:has-text("Add Distributor")');
    this.nameInput = page.locator('input[name="name"]');
    this.phoneInput = page.locator('input[name="phoneNumber"]');
    this.emailInput = page.locator('input[name="email"]');
    this.saveButton = page.locator('a:has-text("Save"), button:has-text("Save")');
  }

  async createDistributor(name, phone) {
    await this.addDistributorButton.click();
    await this.page.waitForURL(url => url.pathname.includes('/distributors/new'));
    await this.page.waitForTimeout(500);
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.emailInput.fill(`dist-${Date.now()}@test.com`);
    await this.saveButton.click();
    await this.page.locator('h1:has-text("Distributors")').waitFor({ state: 'visible', timeout: 15000 });
    await this.page.locator('td:has-text("Loading distributors...")').waitFor({ state: 'detached', timeout: 35000 });
  }
}

module.exports = { DistributorPage };
