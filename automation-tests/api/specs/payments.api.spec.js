const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken } = require('../helpers/authHelper');

test.describe('Payments API Suite', () => {
  let adminToken;
  let orderId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();

    // Create order to pay against
    const client = await getClient(adminToken);
    const setupSuffix = Date.now();

    // Dynamic Customer Setup
    const customerRes = await client.post('/api/customers', {
      data: { name: `E2E Pay Customer ${setupSuffix}`, phoneNumber: `92${setupSuffix.toString().slice(-8)}`, customerType: 'RETAIL' }
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
      data: { name: `E2E Pay Cat ${setupSuffix}`, isActive: true }
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
      data: { name: `E2E Pay Brand ${setupSuffix}` }
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
        sku: `SKU-PAY-${suffix}`,
        name: `Supreme PVC Pipe ${suffix}`,
        mrp: 500.00,
        sellingPrice: 500.00,
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

    const response = await client.post('/api/quotations', {
      data: {
        customerId: customerId,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: '2026-08-30',
        status: 'DRAFT',
        items: [
          {
            productId: productId,
            quantity: 1,
            unitPrice: 500.00
          }
        ]
      }
    });
    const quote = await response.json();
    await client.patch(`/api/quotations/${quote.id}/status`, { params: { status: 'ACCEPTED' } });
    const orderResponse = await client.post(`/api/orders/from-quotation/${quote.id}`);
    const order = await orderResponse.json();
    orderId = order.id;
  });

  test('POS-032 Record full payment against order', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/payments', {
      data: {
        orderId: orderId,
        amount: 500.00,
        paymentMethod: 'CASH',
        referenceNumber: 'TXN-E2E-1'
      }
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.amount).toBe(500.00);
  });

  test('NEG-037 Record payment exceeding balance returns 400', async () => {
    const client = await getClient(adminToken);
    // Balance is currently 0 after previous full payment
    const response = await client.post('/api/payments', {
      data: {
        orderId: orderId,
        amount: 10.00,
        paymentMethod: 'CASH'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('NEG-038 Record payment for non-existent order returns 404', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/payments', {
      data: {
        orderId: 999,
        amount: 100.00,
        paymentMethod: 'CASH'
      }
    });
    expect(response.status()).toBe(404);
  });
});
