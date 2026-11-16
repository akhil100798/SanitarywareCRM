const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { QuotationPage } = require('../frontend/pages/QuotationPage');
const API = process.env.PHASE1_API_URL || 'http://localhost:18091/api';
const session = () => JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../audit-artifacts/phase1-client-session.json'), 'utf8'));

async function api(request, method, resource, data) {
  const response = await request.fetch(API + resource, { method, headers: { Authorization: `Bearer ${session().token}` }, ...(data ? { data } : {}) });
  expect(response.ok(), `${method} ${resource}: ${response.status()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}
async function fixtures(request, withOrder = true) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const customer = await api(request, 'POST', '/customers', { name: `Phase1 customer ${suffix}`, phoneNumber: `94${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`, customerType: 'RETAIL' });
  const product = await api(request, 'POST', '/products', { sku: `PH1-${suffix}`, name: `Phase1 product ${suffix}`, mrp: 100, sellingPrice: 100, stockQuantity: 1000, brandId: session().brandId, categoryId: session().categoryId });
  const order = withOrder ? await api(request, 'POST', '/orders', { customerId: customer.id, orderDate: new Date().toISOString().slice(0, 10), status: 'PENDING', items: [{ productId: product.id, quantity: 1, unitPrice: 100 }] }) : null;
  return { customer, product, order };
}
async function login(page) {
  await page.goto('/login');
  await page.locator('input[name=username]').fill(session().username);
  await page.locator('input[name=password]').fill(session().password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/dashboard/);
}
async function assertBalance(request, orderId, paid, balance, receipts) {
  const order = await api(request, 'GET', `/orders/${orderId}`);
  expect(order.paidAmount).toBe(paid);
  expect(order.balanceAmount).toBe(balance);
  expect(order.paymentStatus).toBe(paid === 0 ? 'UNPAID' : balance === 0 ? 'PAID' : 'PARTIAL');
  expect((await api(request, 'GET', `/payments/order/${orderId}`)).length).toBe(receipts);
}

test('quotation conversion and payment refresh use the real client and derived status', async ({ page, request }) => {
  const { customer, product } = await fixtures(request, false);
  await login(page);
  await page.goto('/quotations');
  await new QuotationPage(page).createQuotation(customer.name, product.name, 1);
  const row = page.locator('table tr').filter({ hasText: customer.name });
  await row.locator('button[title="Mark Accepted"]').click();
  await row.locator('a.text-teal').click();
  await expect(page).toHaveURL(/\/quotations\/edit\//);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Convert to Order', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/edit\/\d+/);
  const orderId = Number(new URL(page.url()).pathname.split('/').pop());
  const converted = await api(request, 'GET', `/orders/${orderId}`);
  await page.getByRole('button', { name: 'Record Payment', exact: true }).first().click();
  await expect(page).toHaveURL(/\/payments\/new\?orderId=/);
  await page.locator('input[name=amount]').fill('60');
  const submitted = page.waitForRequest(r => r.method() === 'POST' && r.url() === API + '/payments');
  await page.getByRole('button', { name: 'Record Receipt', exact: true }).click();
  expect((await submitted).headers()['idempotency-key']).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
  await expect(page).toHaveURL(new RegExp(`/orders/edit/${orderId}$`));
  await assertBalance(request, orderId, 60, converted.total - 60, 1);
  await expect(page.getByLabel('Payment status calculated from receipts')).toBeDisabled();
  await expect(page.getByLabel('Payment status calculated from receipts')).toHaveValue('PARTIAL');
});

test('a lost response and reload retry the same receipt without another financial effect', async ({ page, request }) => {
  const { order } = await fixtures(request);
  await login(page);
  await page.goto(`/payments/new?orderId=${order.id}`);
  await page.locator('input[name=amount]').fill('60');
  const keys = [];
  await page.route(API + '/payments', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    keys.push(route.request().headers()['idempotency-key']);
    const committed = await route.fetch();
    expect(committed.status()).toBe(200);
    if (keys.length === 1) await route.abort('failed');
    else await route.fulfill({ response: committed });
  });
  // Both events run in one browser task: React state alone is insufficient to
  // guard this; the synchronous submit latch must prevent the second request.
  await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole('alert')).toContainText('Retry the same details');
  expect(keys).toHaveLength(1);
  await assertBalance(request, order.id, 60, 40, 1);
  await page.reload();
  await expect(page.locator('input[name=amount]')).toHaveValue('60');
  await expect(page.getByRole('alert')).toContainText('earlier payment attempt');
  await page.getByRole('button', { name: 'Record Receipt', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/edit/${order.id}$`));
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  await assertBalance(request, order.id, 60, 40, 1);
});

test('a competing receipt reports the conflict and refreshes the payable balance', async ({ page, request }) => {
  const { order } = await fixtures(request);
  await login(page);
  await page.goto(`/payments/new?orderId=${order.id}`);
  await expect(page.locator('input[name=amount]')).toHaveValue('100');
  await api(request, 'POST', '/payments', { orderId: order.id, amount: 60, paymentMethod: 'CASH' });
  const keys = [];
  page.on('request', r => { if (r.method() === 'POST' && r.url() === API + '/payments') keys.push(r.headers()['idempotency-key']); });
  await page.getByRole('button', { name: 'Record Receipt', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('exceeds the balance due');
  await expect(page.getByText('Balance Due', { exact: true }).locator('..')).toContainText('40');
  await page.locator('input[name=amount]').fill('40');
  await page.getByRole('button', { name: 'Record Receipt', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/edit/${order.id}$`));
  expect(keys).toHaveLength(2);
  expect(keys[1]).not.toBe(keys[0]);
  await assertBalance(request, order.id, 100, 0, 2);
});

test('editing order status through PUT reserves and restores stock once', async ({ page, request }) => {
  const { order, customer, product } = await fixtures(request);
  await login(page);
  for (const [status, expectedStock] of [['CONFIRMED', 999], ['CANCELLED', 1000]]) {
    await page.goto(`/orders/edit/${order.id}`);
    await expect(page.locator('select[name=customerId]')).toHaveValue(String(customer.id));
    await page.locator('select').filter({ has: page.locator('option[value=CONFIRMED]') }).selectOption(status);
    const updated = page.waitForResponse(r => r.request().method() === 'PUT' && r.url() === API + `/orders/${order.id}`);
    await page.getByRole('button', { name: 'Update Order', exact: true }).first().click();
    expect((await updated).status()).toBe(200);
    await expect(page).toHaveURL(/\/orders$/);
    expect((await api(request, 'GET', `/products/${product.id}`)).stockQuantity).toBe(expectedStock);
  }
});
