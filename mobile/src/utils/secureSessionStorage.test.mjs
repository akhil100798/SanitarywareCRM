import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecureSessionStorage } from './secureSessionStorage.js';

const createMemoryStores = (secureValues = {}, legacyValues = {}) => {
  const secure = new Map(Object.entries(secureValues));
  const legacy = new Map(Object.entries(legacyValues));
  const secureStore = {
    async getItemAsync(key) { return secure.get(key) ?? null; },
    async setItemAsync(key, value) { secure.set(key, value); },
    async deleteItemAsync(key) { secure.delete(key); }
  };
  const legacyStorage = {
    async getItem(key) { return legacy.get(key) ?? null; },
    async setItem(key, value) { legacy.set(key, value); },
    async removeItem(key) { legacy.delete(key); }
  };
  return { secure, legacy, storage: createSecureSessionStorage(secureStore, legacyStorage, 'token') };
};

test('moves a legacy AsyncStorage token into secure storage on read', async () => {
  const { secure, legacy, storage } = createMemoryStores({}, { token: 'legacy-token' });

  assert.equal(await storage.getItem('token'), 'legacy-token');
  assert.equal(secure.get('token'), 'legacy-token');
  assert.equal(legacy.has('token'), false);
});

test('stores bearer tokens securely and user data in AsyncStorage', async () => {
  const { secure, legacy, storage } = createMemoryStores();

  await storage.setItem('token', 'new-token');
  await storage.setItem('user', '{"username":"sales"}');

  assert.equal(secure.get('token'), 'new-token');
  assert.equal(legacy.get('user'), '{"username":"sales"}');
});

test('clears the token from secure and legacy storage and removes user data', async () => {
  const { secure, legacy, storage } = createMemoryStores(
    { token: 'secure-token' },
    { token: 'legacy-token', user: '{"username":"sales"}' }
  );

  await storage.multiRemove(['token', 'user']);

  assert.equal(secure.has('token'), false);
  assert.equal(legacy.has('token'), false);
  assert.equal(legacy.has('user'), false);
});

test('on web platform, operates safely without calling native secure store', async () => {
  let secureStoreCalled = false;
  const secureStore = {
    async getItemAsync() { secureStoreCalled = true; throw new Error('getValueWithKeyAsync is not a function'); },
    async setItemAsync() { secureStoreCalled = true; throw new Error('setValueWithKeyAsync is not a function'); },
    async deleteItemAsync() { secureStoreCalled = true; throw new Error('deleteValueWithKeyAsync is not a function'); }
  };
  const webStorage = new Map();
  const legacyStorage = {
    async getItem(key) { return webStorage.get(key) ?? null; },
    async setItem(key, value) { webStorage.set(key, value); },
    async removeItem(key) { webStorage.delete(key); }
  };

  const storage = createSecureSessionStorage(secureStore, legacyStorage, 'token', { platform: 'web' });

  await storage.setItem('token', 'web-token');
  assert.equal(await storage.getItem('token'), 'web-token');
  assert.equal(secureStoreCalled, false);
  assert.equal(webStorage.get('token'), 'web-token');

  await storage.multiRemove(['token']);
  assert.equal(await storage.getItem('token'), null);
  assert.equal(secureStoreCalled, false);
});

test('when isAvailableAsync returns false, falls back to legacy storage safely', async () => {
  const secureStore = {
    async isAvailableAsync() { return false; },
    async getItemAsync() { throw new Error('not available'); },
    async setItemAsync() { throw new Error('not available'); },
    async deleteItemAsync() { throw new Error('not available'); }
  };
  const memory = new Map();
  const legacyStorage = {
    async getItem(key) { return memory.get(key) ?? null; },
    async setItem(key, value) { memory.set(key, value); },
    async removeItem(key) { memory.delete(key); }
  };

  const storage = createSecureSessionStorage(secureStore, legacyStorage, 'token');

  await storage.setItem('token', 'fallback-token');
  assert.equal(await storage.getItem('token'), 'fallback-token');
  assert.equal(memory.get('token'), 'fallback-token');
});
