const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');

test.describe('Health Check API Suite', () => {

  test('POS-035 Public health check endpoint is accessible without authorization', async () => {
    const client = await getClient();
    const response = await client.get('/api/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('UP');
    expect(json.database).toBeDefined();
  });
});
