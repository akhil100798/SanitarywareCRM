const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken } = require('../helpers/authHelper');

test.describe('Quotations API Suite', () => {
  let adminToken;
  let quotationId;
  let customerId;
  let productId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    const client = await getClient(adminToken);
    const setupSuffix = Date.now();

    // Dynamic Customer Setup
    const customerRes = await client.post('/api/customers', {
      data: { name: `E2E Quote Customer ${setupSuffix}`, phoneNumber: `90${setupSuffix.toString().slice(-8)}`, customerType: 'RETAIL' }
    });
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
      data: { name: `E2E Quote Cat ${setupSuffix}`, isActive: true }
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
      data: { name: `E2E Quote Brand ${setupSuffix}` }
    });
    if (brandRes.status() === 201 || brandRes.status() === 200) {
      const b = await brandRes.json();
      brandId = b.id;
    } else {
      const listRes = await client.get('/api/brands');
      const list = await listRes.json();
      brandId = list[0].id;
    }

    const productRes = await client.post('/api/products', {
      data: {
        sku: `SKU-QUOTE-${setupSuffix}`,
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
  });

  test('POS-027 Create quotation in DRAFT status', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/quotations', {
      data: {
        customerId: customerId,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: '2027-12-31',
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
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('DRAFT');
    quotationId = json.id;
  });

  test('POS-028 Update quotation status to SENT', async () => {
    const client = await getClient(adminToken);
    const response = await client.patch(`/api/quotations/${quotationId}/status`, {
      params: { status: 'SENT' }
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('SENT');
  });

  test('NEG-027 Create quotation with empty items list returns 400', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/quotations', {
      data: {
        customerId: customerId,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: '2027-12-31',
        status: 'DRAFT',
        items: []
      }
    });
    expect(response.status()).toBe(400);
  });

  test('NEG-030 Create quotation with negative quantity returns 400', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/quotations', {
      data: {
        customerId: customerId,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: '2027-12-31',
        status: 'DRAFT',
        items: [
          {
            productId: productId,
            quantity: -5,
            unitPrice: 150.00
          }
        ]
      }
    });
    expect(response.status()).toBe(400);
  });

  test('EXP-001 Send Quotation via WhatsApp endpoint', async () => {
    const client = await getClient(adminToken);
    const response = await client.post(`/api/quotations/${quotationId}/send-whatsapp`, {
      data: { phoneNumber: '+919876543210' }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(['SENT', 'SIMULATED']).toContain(body.status);
    expect(body.recipient).toContain('9876543210');
  });

  test('EXP-002 Customer Portal - Retrieve & Accept Quotation via Share Token without auth', async () => {
    const client = await getClient(adminToken);
    const quoteRes = await client.get(`/api/quotations/${quotationId}`);
    expect(quoteRes.status()).toBe(200);
    const quoteData = await quoteRes.json();
    expect(quoteData.shareToken).toBeTruthy();

    // Anonymous public client (no auth headers)
    const publicClient = await getClient(null);
    const portalRes = await publicClient.get(`/api/portal/quotations/${quoteData.shareToken}`);
    expect(portalRes.status()).toBe(200);
    const portalData = await portalRes.json();
    expect(portalData.quotationNumber).toBe(quoteData.quotationNumber);

    // Accept via portal
    const acceptRes = await publicClient.post(`/api/portal/quotations/${quoteData.shareToken}/accept`);
    expect(acceptRes.status()).toBe(200);
    const acceptedData = await acceptRes.json();
    expect(acceptedData.status).toBe('ACCEPTED');

    // Download PDF via portal
    const pdfRes = await publicClient.get(`/api/portal/quotations/${quoteData.shareToken}/pdf`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()['content-type']).toContain('application/pdf');
  });
});
