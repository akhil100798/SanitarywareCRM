const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { getAdminToken, getSalesToken } = require('../helpers/authHelper');

const internalTokens = ['sqlstate', 'org.hibernate', 'java.lang', 'constraint'];

async function expectSanitizedError(response, status, message) {
  expect(response.status()).toBe(status);
  expect(response.headers()['content-type']).toContain('application/json');
  const body = await response.json();
  expect(body.status).toBe(status);
  expect(body.message).toBe(message);
  const normalizedBody = JSON.stringify(body).toLowerCase();
  for (const token of internalTokens) expect(normalizedBody).not.toContain(token);
  return body;
}

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

  test('POS-CUSTOMER-DEFAULT Missing customer type defaults to RETAIL', async () => {
    const client = await getClient(adminToken);
    const localPhone = `7${Date.now().toString().slice(-9)}`;
    const response = await client.post('/api/customers', {
      data: {
        name: `Default Type Customer ${Date.now()}`,
        phoneNumber: localPhone
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.customerType).toBe('RETAIL');
  });

  test('NEG-CUSTOMER-EMAIL Invalid email returns sanitized 400', async () => {
    const client = await getClient(adminToken);
    const response = await client.post('/api/customers', {
      data: {
        name: 'Invalid Email Customer',
        email: 'invalid-email SQLState org.hibernate java.lang',
        phoneNumber: `6${Date.now().toString().slice(-9)}`
      }
    });

    const body = await expectSanitizedError(response, 400, 'Validation failed');
    expect(body.validationErrors.email).toBe('Email must be valid');
  });

  test('NEG-CUSTOMER-PHONE Duplicate normalized phone returns sanitized 409', async () => {
    const client = await getClient(adminToken);
    const localPhone = `8${Date.now().toString().slice(-9)}`;
    const normalizedPhone = `91${localPhone}`;
    const first = await client.post('/api/customers', {
      data: {
        name: `Phone Owner ${Date.now()}`,
        phoneNumber: normalizedPhone
      }
    });
    expect(first.status()).toBe(201);

    const duplicate = await client.post('/api/customers', {
      data: {
        name: `Duplicate Phone ${Date.now()}`,
        phoneNumber: `+91 ${localPhone.slice(0, 5)}-${localPhone.slice(5)}`
      }
    });

    await expectSanitizedError(duplicate, 409, 'Phone number already exists');
  });

  test('NEG-CUSTOMER-EMAIL-DUPLICATE Duplicate email returns sanitized 409', async () => {
    const client = await getClient(adminToken);
    const suffix = Date.now();
    const email = `customer-${suffix}@example.com`;
    const first = await client.post('/api/customers', {
      data: {
        name: `Email Owner ${suffix}`,
        email,
        phoneNumber: `5${suffix.toString().slice(-9)}`
      }
    });
    expect(first.status()).toBe(201);

    const duplicate = await client.post('/api/customers', {
      data: {
        name: `Duplicate Email ${suffix}`,
        email: ` ${email} `,
        phoneNumber: `4${suffix.toString().slice(-9)}`
      }
    });

    await expectSanitizedError(duplicate, 409, 'Email already exists');
  });
});
