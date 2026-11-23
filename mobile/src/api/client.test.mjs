import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, getErrorMessage } from './client.js';

test('createApiClient attaches Bearer authorization header when token exists', async () => {
  const mockStorage = {
    getToken: async () => 'valid-jwt-token-xyz',
    rejectToken: async () => true
  };

  const client = createApiClient('http://test-server/api', mockStorage);

  // Invoke request interceptor manually or via mock adapter
  const requestConfig = { headers: {} };
  const intercepted = await client.interceptors.request.handlers[0].fulfilled(requestConfig);

  assert.equal(intercepted.headers.Authorization, 'Bearer valid-jwt-token-xyz');
});

test('createApiClient omits authorization header when no token is present', async () => {
  const mockStorage = {
    getToken: async () => null,
    rejectToken: async () => false
  };

  const client = createApiClient('http://test-server/api', mockStorage);
  const requestConfig = { headers: {} };
  const intercepted = await client.interceptors.request.handlers[0].fulfilled(requestConfig);

  assert.equal(intercepted.headers.Authorization, undefined);
});

test('createApiClient adjusts headers and timeout for FormData uploads', async () => {
  const mockStorage = {
    getToken: async () => 'upload-token',
    rejectToken: async () => true
  };

  class FakeFormData {}
  globalThis.FormData = FakeFormData;

  const client = createApiClient('http://test-server/api', mockStorage);
  const requestConfig = {
    headers: { 'Content-Type': 'application/json' },
    data: new FakeFormData()
  };

  const intercepted = await client.interceptors.request.handlers[0].fulfilled(requestConfig);

  assert.equal(intercepted.headers['Content-Type'], undefined);
  assert.equal(intercepted.timeout, 180000);
});

test('createApiClient rejects token in storage on 401 error', async () => {
  let rejectedToken = null;
  const mockStorage = {
    getToken: async () => 'expired-token-123',
    rejectToken: async (tok) => { rejectedToken = tok; return true; }
  };

  const client = createApiClient('http://test-server/api', mockStorage);
  const errorHandler = client.interceptors.response.handlers[0].rejected;

  const mock401Error = {
    response: { status: 401 },
    config: {
      url: '/orders',
      headers: { Authorization: 'Bearer expired-token-123' }
    }
  };

  await assert.rejects(async () => {
    await errorHandler(mock401Error);
  });

  assert.equal(rejectedToken, 'expired-token-123');
});

test('createApiClient does NOT reject token on 401 from /auth/login', async () => {
  let rejectCalled = false;
  const mockStorage = {
    getToken: async () => 'some-token',
    rejectToken: async () => { rejectCalled = true; }
  };

  const client = createApiClient('http://test-server/api', mockStorage);
  const errorHandler = client.interceptors.response.handlers[0].rejected;

  const mockLoginError = {
    response: { status: 401 },
    config: {
      url: '/auth/login',
      headers: { Authorization: 'Bearer some-token' }
    }
  };

  await assert.rejects(async () => {
    await errorHandler(mockLoginError);
  });

  assert.equal(rejectCalled, false);
});

test('getErrorMessage returns proper message for various error shapes', () => {
  // Backend API error
  assert.equal(
    getErrorMessage({ response: { data: { message: 'Product SKU already exists' } } }),
    'Product SKU already exists'
  );

  // Network error
  assert.equal(
    getErrorMessage({ message: 'Network Error' }),
    'Cannot reach the CRM server. Check the mobile API URL and backend status.'
  );

  // Generic Error
  assert.equal(
    getErrorMessage(new Error('Timeout exceeded')),
    'Timeout exceeded'
  );

  // Empty / undefined error
  assert.equal(
    getErrorMessage({}),
    'Something went wrong'
  );
});
