class OrderPage {
  constructor(page) {
    this.page = page;
    this.tableRows = page.locator('table tr');
    this.manageLink = page.locator('a.btn-manage');
    this.downloadPdfButton = page.locator('button.btn-download-pdf');
    this.recordPaymentButton = page.locator('button:has-text("Record Payment")');
  }
}

module.exports = { OrderPage };
