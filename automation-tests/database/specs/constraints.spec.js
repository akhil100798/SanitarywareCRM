const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken } = require('../../api/helpers/authHelper');

test.describe('Database Foreign Key Constraints Test Suite', () => {
  let adminToken;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('NEG-089 Cascade deletion constraint check via deletion', async () => {
    const client = await getClient(adminToken);
    // Deleting customer with orders is blocked by FK constraints
    const response = await client.delete('/api/customers/1');
    // Expect 400 Bad Request or 500 Internal error representing constraint violation
    expect(response.status() === 500 || response.status() === 400).toBe(true);
  });
});
