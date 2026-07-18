const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Temporary deep negative API bug hunt', () => {
  let adminToken;
  let salesToken;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    salesToken = await getSalesToken();
  });

  test('BUG-HUNT null product request body is rejected as a client error', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/products', {
      headers: { 'Content-Type': 'application/json' },
      data: null,
    });
    console.log(`NULL_BODY status=${response.status()} body=${await response.text()}`);
    expect(response.status()).toBe(400);
  });

  test('BUG-HUNT negative product stock is rejected', async () => {
    const client = await getClient(adminToken);
    const categories = await (await client.get('/api/categories')).json();
    const brands = await (await client.get('/api/brands')).json();
    const response = await client.post('/api/products', {
      data: {
        sku: `NEG-STOCK-${Date.now()}`,
        name: 'Negative Stock Bug Hunt',
        mrp: 100,
        sellingPrice: 90,
        stockQuantity: -1,
        categoryId: categories[0].id,
        brandId: brands[0].id,
      },
    });
    console.log(`NEGATIVE_STOCK status=${response.status()} body=${await response.text()}`);
    expect(response.status()).toBe(400);
  });

  test('BUG-HUNT SALES cannot delete products', async () => {
    const admin = await getClient(adminToken);
    const sales = await getClient(salesToken);
    const categories = await (await admin.get('/api/categories')).json();
    const brands = await (await admin.get('/api/brands')).json();
    const createResponse = await admin.post('/api/products', {
      data: {
        sku: `ROLE-DELETE-${Date.now()}`,
        name: 'Role Delete Bug Hunt',
        mrp: 100,
        sellingPrice: 90,
        stockQuantity: 1,
        categoryId: categories[0].id,
        brandId: brands[0].id,
      },
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();

    const deleteResponse = await sales.delete(`/api/products/${product.id}`);
    const status = deleteResponse.status();
    console.log(`SALES_DELETE_PRODUCT status=${status} body=${await deleteResponse.text()}`);
    if (status !== 204) {
      await admin.delete(`/api/products/${product.id}`);
    }
    expect(status).toBe(403);
  });

  test('BUG-HUNT SALES cannot update system settings', async () => {
    const sales = await getClient(salesToken);
    const getResponse = await sales.get('/api/settings');
    expect(getResponse.status()).toBe(200);
    const currentSettings = await getResponse.json();
    const response = await sales.put('/api/settings', { data: currentSettings });
    console.log(`SALES_UPDATE_SETTINGS status=${response.status()} body=${await response.text()}`);
    expect(response.status()).toBe(403);
  });

  test('BUG-HUNT invalid purchase-order distributor is rejected', async () => {
    const admin = await getClient(adminToken);
    const productsPage = await (await admin.get('/api/products')).json();
    const response = await admin.post('/api/purchase-orders', {
      data: {
        distributorId: 9223372036854770000,
        status: 'DRAFT',
        items: [{ productId: productsPage.content[0].id, quantity: 1, unitCost: 10 }],
      },
    });
    console.log(`INVALID_DISTRIBUTOR status=${response.status()} body=${await response.text()}`);
    expect(response.status()).toBe(404);
  });

  test('BUG-HUNT modified JWT is rejected', async () => {
    const tampered = `${adminToken.slice(0, -1)}${adminToken.endsWith('a') ? 'b' : 'a'}`;
    const client = await getClient(tampered);
    const response = await client.get('/api/dashboard');
    console.log(`MODIFIED_JWT status=${response.status()} body=${await response.text()}`);
    expect(response.status()).toBe(401);
  });

  test('BUG-HUNT user profile response never includes password', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/auth/me');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).not.toHaveProperty('password');
  });
});
