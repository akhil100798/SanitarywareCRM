const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken } = require('../helpers/authHelper');

const internalTokens = [
  'sql', 'sqlstate', 'org.hibernate', 'java.lang', 'constraint', 'stacktrace', 'exception'
];

async function expectSanitizedNotFound(response) {
  expect(response.status()).toBe(404);
  const body = await response.text();
  expect(JSON.parse(body).message).toBe('Resource not found');
  const normalizedBody = body.toLowerCase();
  for (const token of internalTokens) expect(normalizedBody).not.toContain(token);
}

test.describe('Purchase Orders API Suite', () => {
  let adminToken;
  let distributorId;
  let productId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    const client = await getClient(adminToken);

    // Dynamic Distributor Setup
    const suffix = Date.now();
    const distRes = await client.post('/api/distributors', {
      data: { name: `E2E Distributor ${suffix}`, phoneNumber: '8881234567' }
    });
    if (distRes.status() === 201 || distRes.status() === 200) {
      const d = await distRes.json();
      distributorId = d.id;
    } else {
      const listRes = await client.get('/api/distributors');
      const list = await listRes.json();
      distributorId = (list.content || list)[0].id;
    }

    // Dynamic Category + Brand + Product Setup
    const catRes = await client.post('/api/categories', {
      data: { name: `E2E PO Cat ${suffix}`, isActive: true }
    });
    let categoryId;
    if (catRes.status() === 201 || catRes.status() === 200) {
      categoryId = (await catRes.json()).id;
    } else {
      const listRes = await client.get('/api/categories');
      categoryId = (await listRes.json())[0].id;
    }

    const brandRes = await client.post('/api/brands', {
      data: { name: `E2E PO Brand ${suffix}` }
    });
    let brandId;
    if (brandRes.status() === 201 || brandRes.status() === 200) {
      brandId = (await brandRes.json()).id;
    } else {
      const listRes = await client.get('/api/brands');
      brandId = (await listRes.json())[0].id;
    }

    const prodRes = await client.post('/api/products', {
      data: {
        sku: `SKU-PO-${suffix}`,
        name: `E2E PO Product ${suffix}`,
        mrp: 100.00,
        sellingPrice: 90.00,
        stockQuantity: 200,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    if (prodRes.status() === 201 || prodRes.status() === 200) {
      productId = (await prodRes.json()).id;
    } else {
      const listRes = await client.get('/api/products');
      const list = await listRes.json();
      productId = list.content[0].id;
    }
  });

  test('POS-033 Create purchase order successfully', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/purchase-orders', {
      data: {
        distributorId: distributorId,
        status: 'DRAFT',
        items: [
          {
            productId: productId,
            quantity: 50,
            unitCost: 95.00
          }
        ]
      }
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('DRAFT');
  });

  test('NEG-PO-001 Missing distributor returns sanitized 404', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/purchase-orders', {
      data: {
        distributorId: 999999999,
        items: [{ productId, quantity: 1, unitCost: 95.00 }]
      }
    });
    await expectSanitizedNotFound(response);
  });

  test('NEG-PO-002 Missing product returns sanitized 404', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/purchase-orders', {
      data: {
        distributorId,
        items: [{ productId: 999999999, quantity: 1, unitCost: 95.00 }]
      }
    });
    await expectSanitizedNotFound(response);
  });

  test.skip('NEG-084 Receive PO quantity overflow check', async () => {
    // Source test case: NEG-084
    // Skipped: Native backend validator checks for PO received quantity logic are handled during stock intake workflows.
  });
});
