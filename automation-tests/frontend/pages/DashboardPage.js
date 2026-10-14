class DashboardPage {
  constructor(page) {
    this.page = page;
    this.header = page.getByTestId('dashboard-heading');
    this.sidebarProductsLink = page.locator('a[href="/products"]');
    this.sidebarCategoriesLink = page.locator('a[href="/categories"]');
    this.sidebarOrdersLink = page.locator('a[href="/orders"]');
    this.sidebarQuotationsLink = page.locator('a[href="/quotations"]');
    this.sidebarCustomersLink = page.locator('a[href="/customers"]');
    this.sidebarDistributorsLink = page.locator('a[href="/distributors"]');
  }
}

module.exports = { DashboardPage };
