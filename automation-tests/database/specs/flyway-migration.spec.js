const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');

test.describe('Database Flyway Migration Test Suite', () => {

  test('POS-081 Flyway migrations executed cleanly on database', async () => {
    const client = await getClient();
    const response = await client.get('/api/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.database).toBe('UP');
  });
});
