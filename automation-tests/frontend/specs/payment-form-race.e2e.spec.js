const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test('partial payment amount survives a delayed earlier order response', async ({ page, request }) => {
  const api = process.env.BACKEND_BASE_URL || 'http://localhost:8081';
  const loginResponse = await request.post(`${api}/api/auth/login`, {
    data: { username: 'qaadmin', password: process.env.QA_ADMIN_PASSWORD }
  });
  expect(loginResponse.ok()).toBeTruthy();
  const { token } = await loginResponse.json();
  const headers = { Authorization: `Bearer ${token}` };
  const owned = [];
  const create = async (resource, data) => {
    const response = await request.post(`${api}/api/${resource}`, { headers, data });
    expect(response.ok()).toBeTruthy();
    const record = await response.json();
    owned.push({ resource, id: record.id });
    return record;
  };
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const deliveries = [];
  let requests = 0;
  let detailUrl;
  try {
    const suffix = Date.now();
    const category = await create('categories', { name: `Payment race category ${suffix}` });
    const brand = await create('brands', { name: `Payment race brand ${suffix}` });
    const customer = await create('customers', { name: `Payment race customer ${suffix}`, phoneNumber: `4${String(suffix).slice(-9)}`, customerType: 'RETAIL' });
    const product = await create('products', { sku: `PAY-RACE-${suffix}`, name: `Payment race product ${suffix}`, categoryId: category.id,
      brandId: brand.id, mrp: 500, sellingPrice: 500, stockQuantity: 10 });
    const order = await create('orders', { customerId: customer.id, orderDate: new Date().toISOString().slice(0, 10),
      taxPercentage: 0, discount: 0, items: [{ productId: product.id, quantity: 1, unitPrice: 500 }] });
    expect(order.balanceAmount).toBe(500);
    expect(order.paidAmount).toBe(0);
    const login = new LoginPage(page);
    await login.navigate();
    await login.login('qaadmin', process.env.QA_ADMIN_PASSWORD);
    detailUrl = `**/api/orders/${order.id}`;
    await page.route(detailUrl, route => {
      const index = ++requests;
      const delivery = (async () => {
        const response = await route.fetch(); // unchanged real API response
        expect(response.ok()).toBeTruthy();
        if (index === 1) await held;
        await route.fulfill({ response });
      })();
      deliveries.push(delivery);
      return delivery;
    });
    await page.goto(`/payments/new?orderId=${order.id}`);
    await expect.poll(() => requests).toBe(2);
    const amount = page.getByRole('spinbutton', { name: 'Payment Amount', exact: true });
    await expect(amount).toHaveValue('500');
    await amount.fill('50');
    release();
    await Promise.all(deliveries);
    await page.waitForLoadState('networkidle');
    await expect(amount).toHaveValue('50');
    await page.unroute(detailUrl);
    const paymentResponse = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/api/payments'));
    await page.getByRole('button', { name: 'Record Receipt', exact: true }).click();
    const paid = await paymentResponse;
    expect(paid.ok()).toBeTruthy();
    owned.push({ resource: 'payments', id: (await paid.json()).id });
    const persisted = await (await request.get(`${api}/api/orders/${order.id}`, { headers })).json();
    expect(persisted.paidAmount).toBe(50);
    expect(persisted.balanceAmount).toBe(450);
    expect(persisted.paymentStatus).toBe('PARTIAL');
  } finally {
    release();
    await Promise.all(deliveries);
    if (detailUrl) await page.unroute(detailUrl);
    for (const record of [...owned].reverse()) {
      expect([200, 204, 404]).toContain((await request.delete(`${api}/api/${record.resource}/${record.id}`, { headers })).status());
    }
  }
});
