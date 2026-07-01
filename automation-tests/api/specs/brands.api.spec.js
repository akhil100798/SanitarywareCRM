const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Brands API Suite', () => {
  let adminToken;
  let salesToken;
  let brandId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    salesToken = await getSalesToken();
  });

  test('POS-012 Admin can create brand', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const response = await client.post('/api/brands', {
      data: {
        name: `Ashirvad ${suffix}`
      }
    });
    expect(response.status()).toBe(201);
    const json = await response.json();
    brandId = json.id;
  });

  test('POS-013 List brands successfully', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/brands');
    expect(response.status()).toBe(200);
  });

  test('NEG-010 Sales cannot delete brand — only ADMIN/MANAGER allowed', async () => {
    // Backend fix applied: @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')") on DELETE /api/brands/{id}
    // Sales role must receive 403 Forbidden.
    const client = await getClient(salesToken);
    const response = await client.delete(`/api/brands/${brandId}`);
    expect(response.status()).toBe(403);
  });

  test('NEG-011-B Admin can delete brand successfully', async () => {
    // Verifies that ADMIN role can still perform the delete (returns 204).
    const client = await getClient(adminToken);
    const response = await client.delete(`/api/brands/${brandId}`);
    expect(response.status()).toBe(204);
  });
});
