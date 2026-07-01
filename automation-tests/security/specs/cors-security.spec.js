const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');

test.describe('Security CORS Headers Test Suite', () => {

  test('NEG-098 Verify backend responds with standard CORS headers', async () => {
    const client = await getClient();
    const response = await client.get('/api/health');
    const headers = response.headers();
    // Verify presence of CORS access headers if configured
    expect(headers['vary'] || headers['access-control-allow-origin']).toBeDefined();
  });
});
