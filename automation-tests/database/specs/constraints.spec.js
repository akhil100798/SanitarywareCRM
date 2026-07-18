const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken } = require('../../api/helpers/authHelper');

const isoDate = (date) => date.toISOString().split('T')[0];

test.describe('Database Foreign Key Constraints Test Suite', () => {
  let adminToken;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('NEG-089 Customer deletion is soft and preserves related orders', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();

    const customerResponse = await client.post('/api/customers', {
      data: {
        name: `Soft Delete Customer ${suffix}`,
        phoneNumber: `91${suffix.toString().slice(-8)}`,
        customerType: 'RETAIL',
      },
    });
    expect(customerResponse.status()).toBe(201);
    const customer = await customerResponse.json();

    const categoryResponse = await client.post('/api/categories', {
      data: { name: `Soft Delete Category ${suffix}`, isActive: true },
    });
    expect(categoryResponse.status()).toBe(201);
    const category = await categoryResponse.json();

    const brandResponse = await client.post('/api/brands', {
      data: { name: `Soft Delete Brand ${suffix}` },
    });
    expect(brandResponse.status()).toBe(201);
    const brand = await brandResponse.json();

    const productResponse = await client.post('/api/products', {
      data: {
        sku: `SOFT-DELETE-${suffix}`,
        name: `Soft Delete Product ${suffix}`,
        mrp: 100,
        sellingPrice: 90,
        stockQuantity: 10,
        categoryId: category.id,
        brandId: brand.id,
      },
    });
    expect(productResponse.status()).toBe(201);
    const product = await productResponse.json();

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    const quotationResponse = await client.post('/api/quotations', {
      data: {
        customerId: customer.id,
        quotationDate: isoDate(new Date()),
        validUntil: isoDate(validUntil),
        status: 'DRAFT',
        items: [{ productId: product.id, quantity: 1, unitPrice: 90 }],
      },
    });
    expect(quotationResponse.status()).toBe(200);
    const quotation = await quotationResponse.json();

    const acceptResponse = await client.patch(`/api/quotations/${quotation.id}/status`, {
      params: { status: 'ACCEPTED' },
    });
    expect(acceptResponse.status()).toBe(200);
    const orderResponse = await client.post(`/api/orders/from-quotation/${quotation.id}`);
    expect(orderResponse.status()).toBe(200);
    const order = await orderResponse.json();

    const deleteResponse = await client.delete(`/api/customers/${customer.id}`);
    expect(deleteResponse.status()).toBe(204);

    const detailResponse = await client.get(`/api/customers/${customer.id}`);
    expect(detailResponse.status()).toBe(200);
    expect((await detailResponse.json()).isActive).toBe(false);

    const activeResponse = await client.get('/api/customers/active');
    expect(activeResponse.status()).toBe(200);
    expect((await activeResponse.json()).some((item) => item.id === customer.id)).toBe(false);

    const retainedOrderResponse = await client.get(`/api/orders/${order.id}`);
    expect(retainedOrderResponse.status()).toBe(200);
    expect((await retainedOrderResponse.json()).customerId).toBe(customer.id);

    await client.dispose();
  });
});
