const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken, getManagerToken, getSalesToken, getWarehouseToken } = require('../../api/helpers/authHelper');
const financialKeys = ['totalRevenue', 'totalReceivables', 'totalPayables', 'distributorPaymentsTotal', 'monthlyRevenue', 'topProducts'];

test('management dashboard retains company-wide financial data', async () => {
  for (const getToken of [getAdminToken, getManagerToken]) {
    const client = await getClient(await getToken());
    try {
      const response = await client.get('/api/dashboard/stats');
      expect(response.status()).toBe(200);
      const data = await response.json();
      for (const key of financialKeys) expect(data).toHaveProperty(key);
      expect(Object.keys(data.monthlyRevenue)).toHaveLength(6);
      for (const order of data.recentOrders || []) {
        expect(order).toHaveProperty('total');
        for (const key of ['subtotal', 'taxAmount', 'paidAmount', 'balanceAmount']) {
          expect(order).not.toHaveProperty(key);
        }
      }
    } finally { await client.dispose(); }
  }
});
test('sales and warehouse dashboard responses omit company-wide financial fields', async () => {
  for (const getToken of [getSalesToken, getWarehouseToken]) {
    const client = await getClient(await getToken());
    try {
      const response = await client.get('/api/dashboard/stats');
      expect(response.status()).toBe(200);
      const data = await response.json();
      for (const key of financialKeys) expect(data).not.toHaveProperty(key);
      expect(data).toHaveProperty('totalOrders');
      expect(data).toHaveProperty('lowStockProducts');
      for (const order of data.recentOrders || []) {
        for (const key of ['subtotal', 'taxAmount', 'total', 'paidAmount', 'balanceAmount']) {
          expect(order).not.toHaveProperty(key);
        }
      }
    } finally { await client.dispose(); }
  }
});
