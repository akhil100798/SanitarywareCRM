class OrderPage {
  constructor(page) {
    this.page = page;
    this.tableRows = page.locator('table tbody tr');
    this.manageLink = page.locator('a:has-text("Manage")');
    this.downloadPdfButton = page.locator('button.btn-download-pdf');
    this.recordPaymentButton = page.locator('a:has-text("Record Payment"), button:has-text("Record Payment")');
  }
}

module.exports = { OrderPage };
