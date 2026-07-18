const { expect } = require('@playwright/test');

class PaymentPage {
  constructor(page) {
    this.page = page;
    this.amountInput = page.locator('input[name="amount"]');
    this.submitPaymentButton = page.locator('button:has-text("Record Receipt")');
    this.balanceDueValue = page.locator('.balance-due-value');
  }

  async recordPayment(amount) {
    await this.page.waitForURL(/\/payments\/new\?orderId=\d+/, { timeout: 15000 });
    await this.amountInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.amountInput.fill(amount.toString());
    await this.submitPaymentButton.click();
    await expect(this.page).toHaveURL(/\/orders\/edit\//, { timeout: 15000 });
  }
}

module.exports = { PaymentPage };
