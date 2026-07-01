const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken } = require('../../api/helpers/authHelper');

test.describe('Database Data Consistency Test Suite', () => {
  let adminToken;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('POS-085 Order total matches payments balance deduction', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/orders/1');
    if (response.ok()) {
      const order = await response.json();
      expect(order.paidAmount + order.balanceAmount).toBe(order.total);
    }
  });
});
