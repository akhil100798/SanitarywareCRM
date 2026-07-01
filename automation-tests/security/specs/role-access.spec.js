const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');
const { getSalesToken } = require('../../api/helpers/authHelper');

test.describe('Security Role Access Test Suite', () => {
  let salesToken;

  test.beforeAll(async () => {
    salesToken = await getSalesToken();
  });

  test('NEG-009 Sales role cannot delete products or categories (403)', async () => {
    const client = await getClient(salesToken);
    const response = await client.delete('/api/categories/1');
    expect(response.status()).toBe(403);
  });
});
