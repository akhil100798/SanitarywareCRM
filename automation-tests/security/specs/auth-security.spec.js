const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');

test.describe('Security Authentication Test Suite', () => {

  test('NEG-006 Verify protected api returns 401 when no token is supplied', async () => {
    const client = await getClient();
    const response = await client.get('/api/products');
    expect(response.status()).toBe(401);
  });

  test('NEG-007 Verify api returns 401 when invalid token is supplied', async () => {
    const client = await getClient('Bearer bad-token-data');
    const response = await client.get('/api/products');
    expect(response.status()).toBe(401);
  });
});
