const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken } = require('../helpers/authHelper');

test.describe('Temporary extended negative API bug hunt', () => {
  let client;

  test.beforeAll(async () => {
    client = await getClient(await getAdminToken());
  });

  test('malformed customer email is rejected', async () => {
    const response = await client.post('/api/customers', {
      data: {
        name: 'Malformed Email Bug Hunt',
        email: `not-an-email-${Date.now()}`,
        phoneNumber: `8${String(Date.now()).slice(-9)}`,
      },
    });
    console.log(`MALFORMED_CUSTOMER_EMAIL status=${response.status()} body=${await response.text()}`);
    expect(response.status()).toBe(400);
  });

  test('duplicate customer phone is rejected', async () => {
    const stamp = Date.now();
    const phoneNumber = `7${String(stamp).slice(-9)}`;
    const first = await client.post('/api/customers', {
      data: { name: 'Duplicate Phone A', email: `phone-a-${stamp}@example.test`, phoneNumber },
    });
    expect(first.status()).toBe(201);
    const second = await client.post('/api/customers', {
      data: { name: 'Duplicate Phone B', email: `phone-b-${stamp}@example.test`, phoneNumber },
    });
    console.log(`DUPLICATE_CUSTOMER_PHONE status=${second.status()} body=${await second.text()}`);
    expect(second.status()).toBe(409);
  });

  test('negative product page is rejected as a client error', async () => {
    const response = await client.get('/api/products?page=-1&size=20');
    console.log(`NEGATIVE_PAGE status=${response.status()} body=${await response.text()}`);
    expect(response.status()).toBe(400);
  });

  test('excessive product page size is rejected', async () => {
    const response = await client.get('/api/products?page=0&size=1000000');
    console.log(`EXCESSIVE_PAGE_SIZE status=${response.status()} body=${await response.text()}`);
    expect(response.status()).toBe(400);
  });
});
