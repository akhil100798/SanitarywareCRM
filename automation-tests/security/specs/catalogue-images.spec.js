const { test, expect, request } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken, getManagerToken, getSalesToken, getWarehouseToken } = require('../../api/helpers/authHelper');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test.describe('Catalogue image authentication policy', () => {
  let clients = [];
  let anonymous, category, brand, product, image;
  test.beforeAll(async () => {
    const tokens = await Promise.all([getAdminToken, getManagerToken, getSalesToken, getWarehouseToken].map(getToken => getToken()));
    clients = await Promise.all(tokens.map(getClient));
    anonymous = await getClient();
    const admin = clients[0];
    const suffix = Date.now();
    const create = async (path, data) => {
      const response = await admin.post(path, { data });
      expect(response.status()).toBe(201); return response.json();
    };
    category = await create('/api/categories', { name: 'Image policy category ' + suffix });
    brand = await create('/api/brands', { name: 'Image policy brand ' + suffix });
    product = await create('/api/products', { name: 'Image policy product ' + suffix, sku: 'AUTH-IMG-' + suffix,
      categoryId: category.id, brandId: brand.id, mrp: 100, sellingPrice: 100, stockQuantity: 10 });
    // Let Playwright supply the multipart boundary; do not reuse a JSON-only request header.
    const uploader = await request.newContext({ baseURL: process.env.BACKEND_BASE_URL || 'http://localhost:8081',
      extraHTTPHeaders: { Authorization: 'Bearer ' + tokens[0] } });
    try {
      const uploaded = await uploader.post(`/api/products/${product.id}/images`, {
        multipart: { file: { name: 'catalogue.png', mimeType: 'image/png', buffer: png }, isPrimary: 'true', displayOrder: '0' }
      });
      expect(uploaded.status()).toBe(201); image = await uploaded.json();
    } finally { await uploader.dispose(); }
  });
  test.afterAll(async () => {
    if (image) expect([200, 204, 404]).toContain((await clients[0].delete(`/api/products/${product.id}/images/${image.id}`)).status());
    for (const [resource, record] of [['products', product], ['categories', category], ['brands', brand]]) {
      if (record) expect([200, 204, 404]).toContain((await clients[0].delete(`/api/${resource}/${record.id}`)).status());
    }
    await Promise.all([...clients, anonymous].filter(Boolean).map(client => client.dispose()));
  });
  test('anonymous image download is rejected without image bytes', async () => {
    const response = await anonymous.get(image.imageUrl);
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).not.toContain('image/');
  });
  test('all four authenticated CRM roles can load bytes without shared caching', async () => {
    for (const client of clients) {
      const response = await client.get(image.imageUrl);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
      expect(response.headers()['cache-control']).toBe('private, no-store');
      expect(await response.body()).toEqual(png);
    }
  });
});
