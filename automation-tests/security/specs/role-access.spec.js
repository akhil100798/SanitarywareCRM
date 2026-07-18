const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../../api/helpers/authHelper');

async function getManagerToken() {
  const client = await getClient();
  const response = await client.post('/api/auth/login', {
    data: {
      username: process.env.QA_MANAGER_USERNAME || 'qamanager',
      password: process.env.QA_MANAGER_PASSWORD || 'Password@123',
    },
  });
  expect(response.status(), 'A QA MANAGER account must be provisioned for role verification').toBe(200);
  return (await response.json()).token;
}

function productPayload(suffix, categoryId, brandId) {
  return {
    sku: `AUTH-${suffix}`,
    name: `Authorization Product ${suffix}`,
    mrp: 1200,
    sellingPrice: 1000,
    stockQuantity: 5,
    reorderLevel: 5,
    categoryId,
    brandId,
  };
}

test.describe('Product and settings role authorization', () => {
  let adminClient;
  let managerClient;
  let salesClient;
  let anonymousClient;
  let protectedProductId;
  let categoryId;
  let brandId;

  test.beforeAll(async () => {
    const [adminToken, managerToken, salesToken] = await Promise.all([
      getAdminToken(),
      getManagerToken(),
      getSalesToken(),
    ]);
    adminClient = await getClient(adminToken);
    managerClient = await getClient(managerToken);
    salesClient = await getClient(salesToken);
    anonymousClient = await getClient();

    const setupSuffix = Date.now();
    const categoryResponse = await adminClient.post('/api/categories', {
      data: { name: `Authorization Category ${setupSuffix}` },
    });
    expect(categoryResponse.status()).toBe(201);
    categoryId = (await categoryResponse.json()).id;
    const brandResponse = await adminClient.post('/api/brands', {
      data: { name: `Authorization Brand ${setupSuffix}` },
    });
    expect(brandResponse.status()).toBe(201);
    brandId = (await brandResponse.json()).id;
    const suffix = `${setupSuffix}-protected`;
    const response = await adminClient.post('/api/products', {
      data: productPayload(suffix, categoryId, brandId),
    });
    expect(response.status()).toBe(201);
    protectedProductId = (await response.json()).id;
  });

  test.afterAll(async () => {
    if (protectedProductId && adminClient) await adminClient.delete(`/api/products/${protectedProductId}`);
    if (categoryId && adminClient) await adminClient.delete(`/api/categories/${categoryId}`);
    if (brandId && adminClient) await adminClient.delete(`/api/brands/${brandId}`);
    await Promise.all([adminClient, managerClient, salesClient, anonymousClient]
      .filter(Boolean)
      .map((client) => client.dispose()));
  });

  test('ADMIN can create, update, and delete products', async () => {
    const suffix = `${Date.now()}-admin`;
    const createResponse = await adminClient.post('/api/products', {
      data: productPayload(suffix, categoryId, brandId),
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();
    const updateResponse = await adminClient.put(`/api/products/${product.id}`, {
      data: { ...productPayload(suffix, categoryId, brandId), name: `Updated Admin Product ${suffix}` },
    });
    expect(updateResponse.status()).toBe(200);
    const deleteResponse = await adminClient.delete(`/api/products/${product.id}`);
    expect(deleteResponse.status()).toBe(204);
  });

  test('MANAGER can create, update, and delete products', async () => {
    const suffix = `${Date.now()}-manager`;
    const createResponse = await managerClient.post('/api/products', {
      data: productPayload(suffix, categoryId, brandId),
    });
    expect(createResponse.status()).toBe(201);
    const product = await createResponse.json();
    const updateResponse = await managerClient.put(`/api/products/${product.id}`, {
      data: { ...productPayload(suffix, categoryId, brandId), name: `Updated Manager Product ${suffix}` },
    });
    expect(updateResponse.status()).toBe(200);
    const deleteResponse = await managerClient.delete(`/api/products/${product.id}`);
    expect(deleteResponse.status()).toBe(204);
  });

  test('SALES cannot create, update, or delete products', async () => {
    const suffix = `${Date.now()}-sales`;
    const createResponse = await salesClient.post('/api/products', {
      data: productPayload(suffix, categoryId, brandId),
    });
    expect(createResponse.status()).toBe(403);
    const updateResponse = await salesClient.put(`/api/products/${protectedProductId}`, {
      data: productPayload(suffix, categoryId, brandId),
    });
    expect(updateResponse.status()).toBe(403);
    const deleteResponse = await salesClient.delete(`/api/products/${protectedProductId}`);
    expect(deleteResponse.status()).toBe(403);
  });

  test('SALES can list and search products', async () => {
    const listResponse = await salesClient.get('/api/products');
    expect(listResponse.status()).toBe(200);
    const searchResponse = await salesClient.get('/api/products/search', {
      params: { query: 'Authorization' },
    });
    expect(searchResponse.status()).toBe(200);
  });

  test('ADMIN and MANAGER can update settings', async () => {
    const adminResponse = await adminClient.put('/api/settings', {
      data: { companyName: 'HydroSleek CRM', currencySymbol: 'INR' },
    });
    expect(adminResponse.status()).toBe(200);
    const managerResponse = await managerClient.put('/api/settings', {
      data: { companyName: 'HydroSleek CRM', currencySymbol: 'INR' },
    });
    expect(managerResponse.status()).toBe(200);
  });

  test('SALES can read settings but cannot update them', async () => {
    const readResponse = await salesClient.get('/api/settings');
    expect(readResponse.status()).toBe(200);
    const updateResponse = await salesClient.put('/api/settings', {
      data: { companyName: 'Unauthorized Sales Update' },
    });
    expect(updateResponse.status()).toBe(403);
  });

  test('unauthenticated settings update returns 401', async () => {
    const response = await anonymousClient.put('/api/settings', {
      data: { companyName: 'Anonymous Update' },
    });
    expect(response.status()).toBe(401);
  });
});
