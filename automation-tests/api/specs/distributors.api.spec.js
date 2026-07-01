const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Distributors API Suite', () => {
  let adminToken;
  let salesToken;
  let distributorId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    salesToken = await getSalesToken();
  });

  test('POS-025 Create distributor successfully', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const response = await client.post('/api/distributors', {
      data: {
        name: `Metro Distributors ${suffix}`,
        phoneNumber: `888${suffix.toString().slice(-7)}`
      }
    });
    // DistributorController uses ResponseEntity.ok() so returns 200
    expect(response.status()).toBe(200);
    const json = await response.json();
    distributorId = json.id;
  });

  test('POS-026 List distributors (admin-only endpoint)', async () => {
    // DistributorController GET is restricted to ADMIN/MANAGER roles
    const client = await getClient(adminToken);
    const response = await client.get('/api/distributors');
    expect(response.status()).toBe(200);
  });

  test('NEG-026-B Sales cannot list distributors (ADMIN-only endpoint)', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/distributors');
    expect(response.status()).toBe(403);
  });

  test('NEG-026 Fetch non-existent distributor returns 404 (admin only)', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/distributors/999999');
    expect(response.status()).toBe(404);
  });
});
