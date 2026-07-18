class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorAlert = page.locator('.error-message, .alert-danger');
  }

  async navigate() {
    await this.page.goto('/login');
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    if (password === 'Password@123') {
      await this.page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 25000 });
    } else {
      await this.errorAlert.waitFor({ state: 'visible', timeout: 15000 });
    }
  }
}

module.exports = { LoginPage };
