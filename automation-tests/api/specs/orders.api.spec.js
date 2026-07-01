const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken } = require('../helpers/authHelper');

test.describe('Orders API Suite', () => {
  let adminToken;
  let quoteId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    const client = await getClient(adminToken);
    const setupSuffix = Date.now();

    // Dynamic Customer Setup
    const customerRes = await client.post('/api/customers', {
      data: { name: `E2E Order Customer ${setupSuffix}`, phoneNumber: `91${setupSuffix.toString().slice(-8)}`, customerType: 'RETAIL' }
    });
    let customerId;
    if (customerRes.status() === 201 || customerRes.status() === 200) {
      const c = await customerRes.json();
      customerId = c.id;
    } else {
      const listRes = await client.get('/api/customers');
      const list = await listRes.json();
      customerId = list.content[0].id;
    }

    // Dynamic Product Setup
    let categoryId;
    const catRes = await client.post('/api/categories', {
      data: { name: `E2E Order Cat ${setupSuffix}`, isActive: true }
    });
    if (catRes.status() === 201 || catRes.status() === 200) {
      const cat = await catRes.json();
      categoryId = cat.id;
    } else {
      const listRes = await client.get('/api/categories');
      const list = await listRes.json();
      categoryId = list[0].id;
    }

    let brandId;
    const brandRes = await client.post('/api/brands', {
      data: { name: `E2E Order Brand ${setupSuffix}` }
    });
    if (brandRes.status() === 201 || brandRes.status() === 200) {
      const b = await brandRes.json();
      brandId = b.id;
    } else {
      const listRes = await client.get('/api/brands');
      const list = await listRes.json();
      brandId = list[0].id;
    }

    let productId;
    const productRes = await client.post('/api/products', {
      data: {
        sku: `SKU-ORDER-${setupSuffix}`,
        name: `Supreme PVC Pipe ${setupSuffix}`,
        mrp: 150.00,
        sellingPrice: 135.00,
        stockQuantity: 100,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    if (productRes.status() === 201 || productRes.status() === 200) {
      const p = await productRes.json();
      productId = p.id;
    } else {
      const listRes = await client.get('/api/products');
      const list = await listRes.json();
      productId = list.content[0].id;
    }

    // Create an accepted quotation to convert
    const response = await client.post('/api/quotations', {
      data: {
        customerId: customerId,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: '2026-08-30',
        status: 'DRAFT',
        items: [
          {
            productId: productId,
            quantity: 2,
            unitPrice: 150.00
          }
        ]
      }
    });
    const quote = await response.json();
    quoteId = quote.id;

    // Accept it
    await client.patch(`/api/quotations/${quoteId}/status`, {
      params: { status: 'ACCEPTED' }
    });
  });

  test('POS-030 Convert accepted quotation to order', async () => {
    const client = await getClient(adminToken);
    const response = await client.post(`/api/orders/from-quotation/${quoteId}`);
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('PENDING');
  });

  test('NEG-033 Convert non-existent quotation returns 404', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/orders/from-quotation/999');
    expect(response.status()).toBe(404);
  });

  test('NEG-034 Convert already converted quotation returns 400', async () => {
    const client = await getClient(adminToken);
    // Attempt second conversion
    const response = await client.post(`/api/orders/from-quotation/${quoteId}`);
    expect(response.status()).toBe(400);
  });
});
