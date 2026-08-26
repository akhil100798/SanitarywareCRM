const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getManagerToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Reports API Suite', () => {
  let adminClient;
  let managerClient;
  let salesClient;

  test.beforeAll(async () => {
    const adminToken = await getAdminToken();
    const managerToken = await getManagerToken();
    const salesToken = await getSalesToken();

    adminClient = await getClient(adminToken);
    managerClient = await getClient(managerToken);
    salesClient = await getClient(salesToken);
  });

  test('POS-REP-01 Admin can fetch sales summary report', async () => {
    const res = await adminClient.get('/api/reports/sales-summary');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalSales');
    expect(body).toHaveProperty('totalOrders');
    expect(body).toHaveProperty('totalTaxCollected');
    expect(body).toHaveProperty('orders');
    expect(Array.isArray(body.orders)).toBe(true);
  });

  test('POS-REP-02 Admin can fetch customer outstanding report', async () => {
    const res = await adminClient.get('/api/reports/customer-outstanding');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalOutstanding');
    expect(body).toHaveProperty('customers');
    expect(Array.isArray(body.customers)).toBe(true);
  });

  test('POS-REP-03 Admin can fetch distributor outstanding report', async () => {
    const res = await adminClient.get('/api/reports/distributor-outstanding');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalOutstanding');
    expect(body).toHaveProperty('distributors');
    expect(Array.isArray(body.distributors)).toBe(true);
  });

  test('POS-REP-04 Manager can fetch payment summary report', async () => {
    const res = await managerClient.get('/api/reports/payment-summary');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalReceived');
    expect(body).toHaveProperty('paymentMethodBreakdown');
  });

  test('POS-REP-05 Manager can fetch purchase summary report', async () => {
    const res = await managerClient.get('/api/reports/purchase-summary');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalPurchases');
    expect(body).toHaveProperty('purchaseOrders');
  });

  test('POS-REP-06 Admin can fetch inventory valuation summary report', async () => {
    const res = await adminClient.get('/api/reports/inventory-summary');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalProducts');
    expect(body).toHaveProperty('totalInventoryValue');
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });

  test('NEG-REP-01 SALES role cannot access sales summary report (returns 403)', async () => {
    const res = await salesClient.get('/api/reports/sales-summary');
    expect(res.status()).toBe(403);
  });

  test('NEG-REP-02 SALES role cannot access inventory summary report (returns 403)', async () => {
    const res = await salesClient.get('/api/reports/inventory-summary');
    expect(res.status()).toBe(403);
  });
});
