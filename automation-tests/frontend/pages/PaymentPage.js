class PaymentPage {
  constructor(page) {
    this.page = page;
    this.amountInput = page.locator('input[name="amount"]');
    this.submitPaymentButton = page.locator('button:has-text("Submit Payment")');
    this.balanceDueValue = page.locator('.balance-due-value');
  }

  async recordPayment(amount) {
    await this.amountInput.fill(amount.toString());
    await this.submitPaymentButton.click();
  }
}

module.exports = { PaymentPage };
