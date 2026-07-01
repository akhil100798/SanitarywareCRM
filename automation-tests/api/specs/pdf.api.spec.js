const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken } = require('../helpers/authHelper');

test.describe('PDF Generation API Suite', () => {
  let adminToken;
  let quotationId;
  let orderId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    const client = await getClient(adminToken);
    const setupSuffix = Date.now();

    // Dynamic Customer Setup
    const customerRes = await client.post('/api/customers', {
      data: { name: `E2E PDF Customer ${setupSuffix}`, phoneNumber: `93${setupSuffix.toString().slice(-8)}`, customerType: 'RETAIL' }
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
      data: { name: `E2E PDF Cat ${setupSuffix}`, isActive: true }
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
      data: { name: `E2E PDF Brand ${setupSuffix}` }
    });
    if (brandRes.status() === 201 || brandRes.status() === 200) {
      const b = await brandRes.json();
      brandId = b.id;
    } else {
      const listRes = await client.get('/api/brands');
      const list = await listRes.json();
      brandId = list[0].id;
    }

    const suffix = setupSuffix;
    let productId;
    const productRes = await client.post('/api/products', {
      data: {
        sku: `SKU-PDF-${suffix}`,
        name: `Supreme PVC Pipe ${suffix}`,
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

    const quoteRes = await client.post('/api/quotations', {
      data: {
        customerId: customerId,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: '2026-08-30',
        status: 'DRAFT',
        items: [
          {
            productId: productId,
            quantity: 5,
            unitPrice: 150.00
          }
        ]
      }
    });
    const quote = await quoteRes.json();
    quotationId = quote.id;

    // Convert to order
    await client.patch(`/api/quotations/${quotationId}/status`, { params: { status: 'ACCEPTED' } });
    const orderRes = await client.post(`/api/orders/from-quotation/${quotationId}`);
    const order = await orderRes.json();
    orderId = order.id;
  });

  test('POS-029 Get quotation PDF returns raw bytes', async () => {
    const client = await getClient(adminToken);
    const response = await client.get(`/api/quotations/${quotationId}/pdf`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
  });

  test('POS-031 Get order invoice PDF returns raw bytes', async () => {
    const client = await getClient(adminToken);
    const response = await client.get(`/api/orders/${orderId}/invoice/pdf`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
  });

  test('NEG-032 Get non-existent quotation PDF returns 404', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/quotations/999/pdf');
    expect(response.status()).toBe(404);
  });

  test('NEG-036 Get non-existent order invoice PDF returns 404', async () => {
    const client = await getClient(adminToken);
    const response = await client.get('/api/orders/999/invoice/pdf');
    expect(response.status()).toBe(404);
  });
});
