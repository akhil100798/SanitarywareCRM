const { test, expect, request } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Products API Suite', () => {
  let adminToken;
  let salesToken;
  let productId;
  let categoryId;
  let brandId;
  let createdBarcode;
  let setupSuffix;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    salesToken = await getSalesToken();

    const client = await getClient(adminToken);
    setupSuffix = Date.now();

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

    // Initial baseline product for suite
    createdBarcode = `890${setupSuffix.toString().slice(-10)}`;
    const prodRes = await client.post('/api/products', {
      data: {
        sku: `SKU-BASE-${setupSuffix}`,
        barcode: createdBarcode,
        name: `Supreme PVC Pipe Base ${setupSuffix}`,
        mrp: 150.00,
        sellingPrice: 135.00,
        stockQuantity: 100,
        reorderLevel: 10,
        hsnCode: '39172300',
        gstRate: 18.00,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    const prodJson = await prodRes.json();
    productId = prodJson.id;
  });

  test('POS-015 Create product successfully', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const barcode = `890${suffix.toString().slice(-10)}`;
    const response = await client.post('/api/products', {
      data: {
        sku: `SKU-${suffix}`,
        barcode: barcode,
        name: `Supreme PVC Pipe ${suffix}`,
        mrp: 150.00,
        sellingPrice: 135.00,
        stockQuantity: 100,
        reorderLevel: 10,
        hsnCode: '39172300',
        gstRate: 18.00,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.sku).toBe(`SKU-${suffix}`);
    expect(json.barcode).toBe(barcode);
    expect(json.hsnCode).toBe('39172300');
    expect(json.gstRate).toBe(18.00);
  });

  test('POS-018 Search products by query', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/products/search', {
      params: { query: 'Supreme' }
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.content).toBeDefined();
  });

  test('POS-CAT-01 Multi-faceted product filtering', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/products', {
      params: {
        categoryId: categoryId.toString(),
        brandId: brandId.toString(),
        minPrice: '100',
        maxPrice: '200',
        inStock: 'true',
        isActive: 'true'
      }
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.content.length).toBeGreaterThan(0);
    const matched = json.content.find(p => p.id === productId);
    expect(matched).toBeDefined();
    expect(matched.categoryId).toBe(categoryId);
    expect(matched.brandId).toBe(brandId);
  });

  test('POS-CAT-02 Lookup product by barcode', async () => {
    const client = await getClient(salesToken);
    const response = await client.get(`/api/products/barcode/${createdBarcode}`);
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.id).toBe(productId);
    expect(json.barcode).toBe(createdBarcode);
  });

  test('POS-CAT-03 Lookup products by HSN code', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/products/hsn/39172300');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.content.length).toBeGreaterThan(0);
  });

  test('POS-CAT-04 Upload, list, and delete product image', async () => {
    const baseURL = process.env.BACKEND_BASE_URL || 'http://localhost:8081';
    const adminUploadClient = await request.newContext({
      baseURL,
      extraHTTPHeaders: { 'Authorization': `Bearer ${adminToken}` }
    });
    const salesClient = await getClient(salesToken);
    const adminClient = await getClient(adminToken);

    // 1. Upload image as Admin
    const uploadRes = await adminUploadClient.post(`/api/products/${productId}/images`, {
      multipart: {
        file: {
          name: 'catalogue-sample.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake image binary content for testing')
        },
        isPrimary: 'true',
        displayOrder: '0'
      }
    });
    expect(uploadRes.status()).toBe(201);
    const imageJson = await uploadRes.json();
    expect(imageJson.id).toBeDefined();
    expect(imageJson.isPrimary).toBe(true);
    const imageId = imageJson.id;

    // 2. Sales can view product images
    const listRes = await salesClient.get(`/api/products/${productId}/images`);
    expect(listRes.status()).toBe(200);
    const imagesList = await listRes.json();
    expect(imagesList.length).toBeGreaterThan(0);

    // 3. Sales cannot delete image
    const salesDeleteRes = await salesClient.delete(`/api/products/${productId}/images/${imageId}`);
    expect(salesDeleteRes.status()).toBe(403);

    // 4. Admin can delete image
    const adminDeleteRes = await adminClient.delete(`/api/products/${productId}/images/${imageId}`);
    expect(adminDeleteRes.status()).toBe(204);
  });

  test('NEG-016 Duplicate SKU registration returns 400 or 409', async () => {
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

  test('NEG-CAT-01 Duplicate barcode registration returns 409', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const response = await client.post('/api/products', {
      data: {
        sku: `SKU-DIFF-${suffix}`,
        barcode: createdBarcode, // reuse baseline product barcode
        name: 'Duplicate Barcode Product',
        mrp: 200.00,
        sellingPrice: 180.00,
        stockQuantity: 10,
        categoryId: categoryId,
        brandId: brandId
      }
    });
    expect([400, 409]).toContain(response.status());
  });

  test('NEG-CAT-02 Invalid price filter returns 400', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/products', {
      params: { minPrice: '500', maxPrice: '100' }
    });
    expect(response.status()).toBe(400);
  });

  test('NEG-CAT-03 Lookup non-existent barcode returns 404', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/products/barcode/UNKNOWN999999');
    expect(response.status()).toBe(404);
  });

  test('NEG-CAT-04 Sales cannot upload product image returns 403', async () => {
    const baseURL = process.env.BACKEND_BASE_URL || 'http://localhost:8081';
    const salesUploadClient = await request.newContext({
      baseURL,
      extraHTTPHeaders: { 'Authorization': `Bearer ${salesToken}` }
    });
    const response = await salesUploadClient.post(`/api/products/${productId}/images`, {
      multipart: {
        file: {
          name: 'sample.png',
          mimeType: 'image/png',
          buffer: Buffer.from('sample content')
        }
      }
    });
    expect(response.status()).toBe(403);
  });
});
