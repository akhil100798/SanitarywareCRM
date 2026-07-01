class DistributorPage {
  constructor(page) {
    this.page = page;
    this.addDistributorButton = page.locator('button:has-text("Add Distributor")');
    this.nameInput = page.locator('input[name="name"]');
    this.phoneInput = page.locator('input[name="phoneNumber"]');
    this.saveButton = page.locator('button:has-text("Save")');
  }

  async createDistributor(name, phone) {
    await this.addDistributorButton.click();
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.saveButton.click();
  }
}

module.exports = { DistributorPage };
