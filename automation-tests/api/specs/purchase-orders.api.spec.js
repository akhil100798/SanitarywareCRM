const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

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
  let salesToken;
  let distributorId;
  let productId;
  let fallbackProductId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    salesToken = await getSalesToken();
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

    // Product with explicit purchase price, barcode, HSN, GST
    const prodRes = await client.post('/api/products', {
      data: {
        sku: `SKU-PO-${suffix}`,
        name: `E2E PO Product ${suffix}`,
        mrp: 1500.00,
        sellingPrice: 1200.00,
        purchasePrice: 850.00,
        barcode: `BAR-PO-${suffix}`,
        hsnCode: '69101000',
        gstRate: 18.00,
        stockQuantity: 50,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    const prodJson = await prodRes.json();
    productId = prodJson.id;

    // Product with null purchase price for fallback testing
    const fallbackProdRes = await client.post('/api/products', {
      data: {
        sku: `SKU-PO-FALLBACK-${suffix}`,
        name: `E2E PO Fallback Product ${suffix}`,
        mrp: 900.00,
        sellingPrice: 750.00,
        stockQuantity: 30,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    const fallbackJson = await fallbackProdRes.json();
    fallbackProductId = fallbackJson.id;
  });

  test('POS-033 Create purchase order successfully with purchasePrice and metadata snapshot', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/purchase-orders', {
      data: {
        distributorId: distributorId,
        status: 'DRAFT',
        taxPercentage: 18.00,
        items: [
          {
            productId: productId,
            quantity: 20
          }
        ]
      }
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('DRAFT');
    expect(json.items).toHaveLength(1);
    expect(json.items[0].unitCost).toBe(850.00);
    expect(json.items[0].lineTotal).toBe(17000.00);
    expect(json.items[0].barcode).toContain('BAR-PO-');
    expect(json.items[0].hsnCode).toBe('69101000');
    expect(json.items[0].gstRate).toBe(18.00);
  });

  test('POS-PO-002 Create PO falls back to sellingPrice when purchasePrice is null', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/purchase-orders', {
      data: {
        distributorId: distributorId,
        status: 'DRAFT',
        items: [
          {
            productId: fallbackProductId,
            quantity: 5
          }
        ]
      }
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.items[0].unitCost).toBe(750.00); // sellingPrice fallback
    expect(json.items[0].lineTotal).toBe(3750.00);
  });

  test('POS-PO-003 Receiving PO atomically increments product stock in catalogue', async () => {
    const client = await getClient(adminToken);

    // Check initial stock
    const beforeProdRes = await client.get(`/api/products/${productId}`);
    const beforeProd = await beforeProdRes.json();
    const initialStock = beforeProd.stockQuantity;

    // Create PO
    const createRes = await client.post('/api/purchase-orders', {
      data: {
        distributorId: distributorId,
        status: 'ORDERED',
        items: [
          {
            productId: productId,
            quantity: 25,
            unitCost: 850.00
          }
        ]
      }
    });
    expect(createRes.status()).toBe(200);
    const po = await createRes.json();

    // Receive PO via specialized receive endpoint
    const receiveRes = await client.post(`/api/purchase-orders/${po.id}/receive`);
    expect(receiveRes.status()).toBe(200);
    const receivedPo = await receiveRes.json();
    expect(receivedPo.status).toBe('RECEIVED');
    expect(receivedPo.receivedDate).toBeTruthy();

    // Verify stock incremented by 25
    const afterProdRes = await client.get(`/api/products/${productId}`);
    const afterProd = await afterProdRes.json();
    expect(afterProd.stockQuantity).toBe(initialStock + 25);
  });

  test('NEG-PO-004 Duplicate receiving on already RECEIVED PO returns 409 Conflict', async () => {
    const client = await getClient(adminToken);

    // Create and receive PO
    const createRes = await client.post('/api/purchase-orders', {
      data: {
        distributorId: distributorId,
        status: 'ORDERED',
        items: [{ productId: productId, quantity: 5, unitCost: 850.00 }]
      }
    });
    const po = await createRes.json();
    const firstReceive = await client.post(`/api/purchase-orders/${po.id}/receive`);
    expect(firstReceive.status()).toBe(200);

    // Attempt second receive
    const secondReceive = await client.post(`/api/purchase-orders/${po.id}/receive`);
    expect(secondReceive.status()).toBe(409);
    const err = await secondReceive.json();
    expect(err.message).toContain('already been received');
  });

  test('NEG-PO-005 Receiving cancelled PO returns 409 Conflict', async () => {
    const client = await getClient(adminToken);

    // Create and cancel PO
    const createRes = await client.post('/api/purchase-orders', {
      data: {
        distributorId: distributorId,
        status: 'CANCELLED',
        items: [{ productId: productId, quantity: 5, unitCost: 850.00 }]
      }
    });
    const po = await createRes.json();

    // Attempt receive on cancelled PO
    const receiveRes = await client.post(`/api/purchase-orders/${po.id}/receive`);
    expect(receiveRes.status()).toBe(409);
    const err = await receiveRes.json();
    expect(err.message).toContain('Cannot receive a cancelled Purchase Order');
  });

  test('NEG-PO-006 SALES role cannot receive purchase orders (returns 403)', async () => {
    const adminClient = await getClient(adminToken);
    const createRes = await adminClient.post('/api/purchase-orders', {
      data: {
        distributorId: distributorId,
        status: 'ORDERED',
        items: [{ productId: productId, quantity: 5, unitCost: 850.00 }]
      }
    });
    const po = await createRes.json();

    const salesClient = await getClient(salesToken);
    const receiveRes = await salesClient.post(`/api/purchase-orders/${po.id}/receive`);
    expect(receiveRes.status()).toBe(403);
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
});
