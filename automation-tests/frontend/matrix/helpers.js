const { expect } = require('@playwright/test');

const credentials = {
  SALES: { username: 'qasales', password: 'Password@123' },
  ADMIN: { username: 'qaadmin', password: 'Password@123' },
  MANAGER: { username: 'qamanager', password: 'Password@123' },
  WAREHOUSE: { username: 'qawarehouse', password: 'Password@123' },
};

async function loginAs(page, role = 'ADMIN') {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill(credentials[role].username);
  await page.locator('input[name="password"]').fill(credentials[role].password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/, { timeout: 25000 });
  await expect(page.getByText(role, { exact: true })).toBeVisible({ timeout: 15000 });
}

async function cleanSession(page) {
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {}
}

function uniqueId(prefix = 'TEST') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

module.exports = {
  credentials,
  loginAs,
  cleanSession,
  uniqueId
};
