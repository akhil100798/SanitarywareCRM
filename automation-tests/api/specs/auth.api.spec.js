const { test, expect } = require('@playwright/test');
const { getClient } = require('../helpers/apiClient');
const { assertOk, assertShape } = require('../helpers/assertionHelper');

test.describe('Authentication API Suite', () => {

  test.beforeAll(async () => {
    const client = await getClient();
    // 1. Register admin user if not exists
    const adminCheck = await client.post('/api/auth/login', {
      data: { username: 'qaadmin', password: 'Password@123' }
    });
    if (adminCheck.status() === 401) {
      await client.post('/api/auth/register', {
        data: {
          username: 'qaadmin',
          password: 'Password@123',
          email: 'qaadmin@test.com',
          fullName: 'QA Admin User',
          phoneNumber: '9000000001'
        }
      });
    }

    // 2. Register sales user if not exists
    const salesCheck = await client.post('/api/auth/login', {
      data: { username: 'qasales', password: 'Password@123' }
    });
    if (salesCheck.status() === 401) {
      const loginRes = await client.post('/api/auth/login', {
        data: { username: 'qaadmin', password: 'Password@123' }
      });
      const { token } = await loginRes.json();
      const adminClient = await getClient(token);
      await adminClient.post('/api/auth/register', {
        data: {
          username: 'qasales',
          password: 'Password@123',
          email: 'qasales@test.com',
          fullName: 'QA Sales User',
          phoneNumber: '9000000002'
        }
      });
    }
  });

  test('POS-003 Admin can login with valid credentials', async () => {
    const client = await getClient();
    const response = await client.post('/api/auth/login', {
      data: {
        username: 'qaadmin',
        password: 'Password@123'
      }
    });
    assertOk(response, 200);
    const json = await response.json();
    assertShape(json, ['token', 'type']);
  });

  test('POS-004 Sales can login with valid credentials', async () => {
    const client = await getClient();
    const response = await client.post('/api/auth/login', {
      data: {
        username: 'qasales',
        password: 'Password@123'
      }
    });
    assertOk(response, 200);
  });

  test('NEG-001 Login with invalid username returns 401', async () => {
    const client = await getClient();
    const response = await client.post('/api/auth/login', {
      data: {
        username: 'fakeuser',
        password: 'Password@123'
      }
    });
    expect(response.status()).toBe(401);
  });

  test('NEG-002 Login with incorrect password returns 401', async () => {
    const client = await getClient();
    const response = await client.post('/api/auth/login', {
      data: {
        username: 'qaadmin',
        password: 'WrongPassword'
      }
    });
    expect(response.status()).toBe(401);
  });

  test('NEG-006 Access profile without JWT returns 401', async () => {
    const client = await getClient();
    const response = await client.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('NEG-007 Access profile with expired JWT returns 401', async () => {
    const client = await getClient('Bearer expired-token-xyz');
    const response = await client.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });
});
