const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken } = require('../helpers/authHelper');

test.describe('Dashboard API Suite', () => {
  let adminToken;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('POS-034 Get dashboard summary stats', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/dashboard/stats');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('totalRevenue');
    expect(json).toHaveProperty('totalOrders');
  });
});
