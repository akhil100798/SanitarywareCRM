const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken } = require('../helpers/authHelper');

test.describe('Inventory Analytics API Suite', () => {
  let adminToken;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('EXP-003 GET /api/inventory-analytics/alerts returns low stock alerts', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/inventory-analytics/alerts');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('productId');
      expect(data[0]).toHaveProperty('sku');
      expect(data[0]).toHaveProperty('urgency');
    }
  });

  test('EXP-004 GET /api/inventory-analytics/reorder-suggestions returns predictive suggestions', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/inventory-analytics/reorder-suggestions');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('suggestedReorderQuantity');
      expect(data[0]).toHaveProperty('dailySalesVelocity');
      expect(data[0]).toHaveProperty('estimatedTotalCost');
    }
  });

  test('EXP-005 GET /api/inventory-analytics/summary returns consolidated intelligence metrics', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/inventory-analytics/summary');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('totalProducts');
    expect(data).toHaveProperty('healthyStockCount');
    expect(data).toHaveProperty('lowStockCount');
    expect(data).toHaveProperty('outOfStockCount');
    expect(data).toHaveProperty('totalReorderEstimatedCost');
    expect(Array.isArray(data.lowStockAlerts)).toBe(true);
    expect(Array.isArray(data.reorderSuggestions)).toBe(true);
  });
});
