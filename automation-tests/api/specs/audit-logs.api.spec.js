const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getManagerToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Audit Logs API Suite', () => {
  let adminToken;
  let managerToken;
  let salesToken;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    managerToken = await getManagerToken();
    salesToken = await getSalesToken();
  });

  test('AUDIT-001 Admin can retrieve audit logs', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/audit-logs?page=0&size=10');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('content');
    expect(Array.isArray(json.content)).toBe(true);
  });

  test('AUDIT-002 Manager can retrieve audit logs', async () => {
    const client = await getClient(managerToken);
    const response = await client.get('/api/audit-logs?page=0&size=10');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty('content');
    expect(Array.isArray(json.content)).toBe(true);
  });

  test('AUDIT-003 Sales representative is forbidden from accessing audit logs', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/audit-logs?page=0&size=10');
    expect(response.status()).toBe(403);
  });
});
