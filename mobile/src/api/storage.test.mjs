import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_KEY,
  USER_KEY,
  createWebStorage,
  createStorageManager
} from './storage.js';

test('TOKEN_KEY and USER_KEY match expected application storage keys', () => {
  assert.equal(TOKEN_KEY, 'sanitaryware_crm_token');
  assert.equal(USER_KEY, 'sanitaryware_crm_user');
});

test('createWebStorage interacts with global sessionStorage when available', async () => {
  const store = new Map();
  const mockGlobal = {
    sessionStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    }
  };

  const webStorage = createWebStorage(mockGlobal);

  await webStorage.setItem('testKey', 'webValue');
  assert.equal(await webStorage.getItem('testKey'), 'webValue');
  await webStorage.removeItem('testKey');
  assert.equal(await webStorage.getItem('testKey'), null);
});

test('createWebStorage falls back to fallbackStorage when global sessionStorage is absent or throws', async () => {
  const fallbackStore = new Map();
  const fallbackStorage = {
    getItem: async (k) => fallbackStore.get(k) ?? null,
    setItem: async (k, v) => fallbackStore.set(k, v),
    removeItem: async (k) => fallbackStore.delete(k)
  };

  const failingGlobal = {
    get sessionStorage() {
      throw new Error('Access denied in iframe');
    }
  };

  const webStorage = createWebStorage(failingGlobal, fallbackStorage);

  await webStorage.setItem('fallbackKey', 'val123');
  assert.equal(await webStorage.getItem('fallbackKey'), 'val123');
  assert.equal(fallbackStore.get('fallbackKey'), 'val123');
  await webStorage.removeItem('fallbackKey');
  assert.equal(await webStorage.getItem('fallbackKey'), null);
});

test('createStorageManager on web platform uses webStorage without calling secureStore', async () => {
  const webStore = new Map();
  const mockGlobal = {
    sessionStorage: {
      getItem: (k) => webStore.get(k) ?? null,
      setItem: (k, v) => webStore.set(k, String(v)),
      removeItem: (k) => webStore.delete(k)
    }
  };

  let secureStoreUsed = false;
  const secureStore = {
    getItemAsync: async () => { secureStoreUsed = true; return null; },
    setItemAsync: async () => { secureStoreUsed = true; },
    deleteItemAsync: async () => { secureStoreUsed = true; }
  };

  const manager = createStorageManager({
    platform: 'web',
    globalObj: mockGlobal,
    secureStore
  });

  await manager.setToken('web-jwt-token');
  assert.equal(await manager.getToken(), 'web-jwt-token');
  assert.equal(webStore.get(TOKEN_KEY), 'web-jwt-token');
  assert.equal(secureStoreUsed, false);

  await manager.setUser({ username: 'sales_web', role: 'SALES' });
  const user = await manager.getUser();
  assert.equal(user.username, 'sales_web');

  await manager.clear();
  assert.equal(await manager.getToken(), null);
  assert.equal(await manager.getUser(), null);
});

test('createStorageManager on native platform routes token to secureStore and user to asyncStorage', async () => {
  const secureMap = new Map();
  const asyncMap = new Map();

  const secureStore = {
    getItemAsync: async (k) => secureMap.get(k) ?? null,
    setItemAsync: async (k, v) => secureMap.set(k, v),
    deleteItemAsync: async (k) => secureMap.delete(k)
  };

  const asyncStorage = {
    getItem: async (k) => asyncMap.get(k) ?? null,
    setItem: async (k, v) => asyncMap.set(k, v),
    removeItem: async (k) => asyncMap.delete(k)
  };

  const manager = createStorageManager({
    platform: 'android',
    secureStore,
    asyncStorage
  });

  await manager.setToken('native-jwt-token');
  assert.equal(secureMap.get(TOKEN_KEY), 'native-jwt-token');
  assert.equal(asyncMap.has(TOKEN_KEY), false);

  await manager.setUser({ username: 'warehouse_native', role: 'WAREHOUSE' });
  assert.equal(asyncMap.has(USER_KEY), true);
  assert.equal(secureMap.has(USER_KEY), false);

  const restoredToken = await manager.getToken();
  const restoredUser = await manager.getUser();
  assert.equal(restoredToken, 'native-jwt-token');
  assert.equal(restoredUser.role, 'WAREHOUSE');
});
