const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test('customer search survives delayed initial directory responses', async ({ page, request }) => {
  const api = process.env.BACKEND_BASE_URL || 'http://localhost:8081';
  const authResponse = await request.post(`${api}/api/auth/login`, {
    data: { username: 'qaadmin', password: process.env.QA_ADMIN_PASSWORD }
  });
  expect(authResponse.ok()).toBeTruthy();
  const { token } = await authResponse.json();
  const headers = { Authorization: `Bearer ${token}` };
  const name = `Search race ${Date.now()}`;
  const created = await request.post(`${api}/api/customers`, { headers, data: {
    name, phoneNumber: `6${String(Date.now()).slice(-9)}`, customerType: 'RETAIL'
  } });
  expect(created.status()).toBe(201);
  const customer = await created.json();
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const delayed = [];
  const deliveries = [];
  try {
    const login = new LoginPage(page);
    await login.navigate();
    await login.login('qaadmin', process.env.QA_ADMIN_PASSWORD);
    // Fetch the real backend response unchanged. Delay delivery only, not API behavior.
    await page.route('**/api/customers?*', route => {
      const delivery = (async () => {
      const response = await route.fetch();
      expect(response.ok()).toBeTruthy();
      delayed.push(response);
      await held;
      await route.fulfill({ response });
      })();
      deliveries.push(delivery);
      return delivery;
    });
    await page.goto('/customers');
    const search = page.getByRole('searchbox', { name: 'Search customers', exact: true });
    await search.fill(name);
    await expect.poll(() => delayed.length).toBeGreaterThan(0);
    const searched = page.waitForResponse(response => response.url().includes('/api/customers/search?'));
    await search.press('Enter');
    expect((await searched).ok()).toBeTruthy();
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    expect(delayed.length).toBeGreaterThan(0);
    release();
    await page.waitForLoadState('networkidle');
    await expect(row).toBeVisible();
    await expect(search).toHaveValue(name);
  } finally {
    release();
    await Promise.all(deliveries);
    await page.unroute('**/api/customers?*');
    expect((await request.delete(`${api}/api/customers/${customer.id}`, { headers })).status()).toBe(204);
  }
});

test('customer edits survive a delayed earlier detail response', async ({ page, request }) => {
  const api = process.env.BACKEND_BASE_URL || 'http://localhost:8081';
  const authResponse = await request.post(`${api}/api/auth/login`, {
    data: { username: 'qaadmin', password: process.env.QA_ADMIN_PASSWORD }
  });
  expect(authResponse.ok()).toBeTruthy();
  const { token } = await authResponse.json();
  const headers = { Authorization: `Bearer ${token}` };
  const name = `Edit race ${Date.now()}`;
  const created = await request.post(`${api}/api/customers`, { headers, data: {
    name, phoneNumber: `5${String(Date.now()).slice(-9)}`, customerType: 'RETAIL'
  } });
  expect(created.status()).toBe(201);
  const customer = await created.json();
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let requests = 0;
  const deliveries = [];
  const detailUrl = `**/api/customers/${customer.id}`;
  try {
    const login = new LoginPage(page);
    await login.navigate();
    await login.login('qaadmin', process.env.QA_ADMIN_PASSWORD);
    await page.route(detailUrl, route => {
      const index = ++requests;
      const delivery = (async () => {
        const response = await route.fetch();
        expect(response.ok()).toBeTruthy();
        if (index === 1) await held;
        await route.fulfill({ response });
      })();
      deliveries.push(delivery);
      return delivery;
    });
    await page.goto(`/customers/edit/${customer.id}`);
    await expect.poll(() => requests).toBe(2);
    const input = page.getByRole('textbox', { name: 'Full Name', exact: true });
    await expect(input).toHaveValue(name);
    await input.fill(name + ' edited');
    release();
    await Promise.all(deliveries);
    await page.waitForLoadState('networkidle');
    await expect(input).toHaveValue(name + ' edited');
    await page.unroute(detailUrl);
    const saved = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith(`/api/customers/${customer.id}`));
    await page.getByRole('button', { name: 'Save Customer', exact: true }).click();
    expect((await saved).ok()).toBeTruthy();
    const persisted = await request.get(`${api}/api/customers/${customer.id}`, { headers });
    expect((await persisted.json()).name).toBe(name + ' edited');
  } finally {
    release();
    await Promise.all(deliveries);
    await page.unroute(detailUrl);
    expect((await request.delete(`${api}/api/customers/${customer.id}`, { headers })).status()).toBe(204);
  }
});
