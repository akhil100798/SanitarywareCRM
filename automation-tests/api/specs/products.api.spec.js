const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Products API Suite', () => {
  let adminToken;
  let salesToken;
  let productId;
  let categoryId;
  let brandId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    salesToken = await getSalesToken();

    const client = await getClient(adminToken);
    const setupSuffix = Date.now();

    // Dynamic Category Setup
    const catRes = await client.post('/api/categories', {
      data: { name: `E2E Products Cat ${setupSuffix}`, description: 'Temp desc', isActive: true }
    });
    if (catRes.status() === 201 || catRes.status() === 200) {
      const cat = await catRes.json();
      categoryId = cat.id;
    } else {
      const listRes = await client.get('/api/categories');
      const list = await listRes.json();
      categoryId = list[0].id;
    }

    // Dynamic Brand Setup
    const brandRes = await client.post('/api/brands', {
      data: { name: `E2E Products Brand ${setupSuffix}` }
    });
    if (brandRes.status() === 201 || brandRes.status() === 200) {
      const b = await brandRes.json();
      brandId = b.id;
    } else {
      const listRes = await client.get('/api/brands');
      const list = await listRes.json();
      brandId = list[0].id;
    }
  });

  test('POS-015 Create product successfully', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const response = await client.post('/api/products', {
      data: {
        sku: `SKU-${suffix}`,
        name: `Supreme PVC Pipe ${suffix}`,
        mrp: 150.00,
        sellingPrice: 135.00,
        stockQuantity: 100,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    expect(response.status()).toBe(201);
    const json = await response.json();
    productId = json.id;
  });

  test('POS-018 Search products by query', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/products/search', {
      params: { query: 'Supreme' }
    });
    expect(response.status()).toBe(200);
  });

  test('NEG-016 Duplicate SKU registration returns 400', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const sku = `SKU-DUP-${suffix}`;

    // Create first
    await client.post('/api/products', {
      data: {
        sku: sku,
        name: 'PVC First',
        mrp: 100.0,
        sellingPrice: 90.0,
        stockQuantity: 10,
        categoryId: categoryId,
        brandId: brandId
      }
    });

    // Create duplicate SKU
    const response = await client.post('/api/products', {
      data: {
        sku: sku,
        name: 'PVC Duplicate',
        mrp: 100.0,
        sellingPrice: 90.0,
        stockQuantity: 10,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    expect([400, 409]).toContain(response.status());
  });

  test('NEG-017 Create product negative price returns 400', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/products', {
      data: {
        sku: 'SKU-NEG',
        name: 'Negative Price Pipe',
        mrp: -150.00,
        sellingPrice: 135.00,
        stockQuantity: 100,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    expect(response.status()).toBe(400);
  });
});
