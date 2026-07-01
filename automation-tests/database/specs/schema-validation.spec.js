const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');

test.describe('Database Schema Validation Test Suite', () => {

  test('POS-082 Hibernate schema validation matches database migrations', async () => {
    const client = await getClient();
    const response = await client.get('/api/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    // If mismatch occurred, status would be DOWN
    expect(json.status).toBe('UP');
  });
});
