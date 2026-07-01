const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Categories API Suite', () => {
  let adminToken;
  let salesToken;
  let categoryId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    salesToken = await getSalesToken();
  });

  test('POS-007 Admin can create root category', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const response = await client.post('/api/categories', {
      data: {
        name: `Pipes ${suffix}`,
        description: 'Sanitaryware conduit systems',
        isActive: true
      }
    });
    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.name).toBe(`Pipes ${suffix}`);
    categoryId = json.id;
  });

  test('POS-008 Admin can create sub-category', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const response = await client.post('/api/categories', {
      data: {
        name: `PVC Sub ${suffix}`,
        parentId: categoryId,
        isActive: true
      }
    });
    expect(response.status()).toBe(201);
  });

  test('POS-009 Anyone can list categories', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/categories');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(Array.isArray(json)).toBe(true);
  });

  test('NEG-009 Sales cannot delete category — only ADMIN/MANAGER allowed', async () => {
    // Backend fix applied: @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')") on DELETE /api/categories/{id}
    // Sales role must receive 403 Forbidden.
    const client = await getClient(salesToken);
    const response = await client.delete(`/api/categories/${categoryId}`);
    expect(response.status()).toBe(403);
  });

  test('NEG-011 Admin can delete category successfully', async () => {
    // Verifies that ADMIN role can still perform the delete (returns 204).
    const client = await getClient(adminToken);
    const response = await client.delete(`/api/categories/${categoryId}`);
    expect(response.status()).toBe(204);
  });

  test('NEG-012 Create category with empty name returns 400', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/categories', {
      data: {
        name: '',
        isActive: true
      }
    });
    expect(response.status()).toBe(400);
  });
});
