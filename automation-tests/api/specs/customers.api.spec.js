const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

test.describe('Customers API Suite', () => {
  let adminToken;
  let salesToken;
  let customerId;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
    salesToken = await getSalesToken();
  });

  test('POS-022 Create customer successfully', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const response = await client.post('/api/customers', {
      data: {
        name: `Ramesh Sharma ${suffix}`,
        phoneNumber: `9${suffix.toString().slice(-9)}`,
        customerType: 'RETAIL'
      }
    });
    expect(response.status()).toBe(201);
    const json = await response.json();
    customerId = json.id;
  });

  test('POS-023 List customers with pagination', async () => {
    const client = await getClient(salesToken);
    const response = await client.get('/api/customers');
    expect(response.status()).toBe(200);
  });

  test('NEG-023 Create customer missing phone number returns 400', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/customers', {
      data: {
        name: 'No Phone Customer',
        customerType: 'RETAIL'
      }
    });
    expect(response.status()).toBe(400);
  });
});
