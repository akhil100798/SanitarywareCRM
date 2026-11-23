import { createSessionStore } from '../utils/sessionStore.js';
import { createSecureSessionStorage } from '../utils/secureSessionStorage.js';

export const TOKEN_KEY = 'sanitaryware_crm_token';
export const USER_KEY = 'sanitaryware_crm_user';

let Platform;
try {
  Platform = require('react-native').Platform;
} catch {
  Platform = { OS: 'web' };
}

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage');
  if (AsyncStorage?.default) AsyncStorage = AsyncStorage.default;
} catch {
  AsyncStorage = null;
}

let SecureStore;
try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

// Web session storage adapter for Expo Web target
export const createWebStorage = (globalObj = (typeof globalThis !== 'undefined' ? globalThis : null), fallbackStorage = AsyncStorage) => ({
  getItem: (key) => {
    try {
      if (globalObj && globalObj.sessionStorage) {
        return Promise.resolve(globalObj.sessionStorage.getItem(key));
      }
    } catch { /* fallback to AsyncStorage */ }
    return fallbackStorage?.getItem ? fallbackStorage.getItem(key) : Promise.resolve(null);
  },
  setItem: (key, value) => {
    try {
      if (globalObj && globalObj.sessionStorage) {
        globalObj.sessionStorage.setItem(key, value);
        return Promise.resolve();
      }
    } catch { /* fallback to AsyncStorage */ }
    return fallbackStorage?.setItem ? fallbackStorage.setItem(key, value) : Promise.resolve();
  },
  removeItem: (key) => {
    try {
      if (globalObj && globalObj.sessionStorage) {
        globalObj.sessionStorage.removeItem(key);
      }
    } catch { /* fallback to AsyncStorage */ }
    return fallbackStorage?.removeItem ? fallbackStorage.removeItem(key) : Promise.resolve();
  }
});

export const createStorageManager = ({
  platform = Platform?.OS || 'web',
  asyncStorage = AsyncStorage,
  secureStore = SecureStore,
  globalObj = (typeof globalThis !== 'undefined' ? globalThis : null),
  tokenKey = TOKEN_KEY,
  userKey = USER_KEY
} = {}) => {
  const webStorage = createWebStorage(globalObj, asyncStorage);
  const tokenStorage = platform === 'web' ? webStorage : asyncStorage;
  const secureStorage = createSecureSessionStorage(
    platform === 'web' ? null : secureStore,
    tokenStorage,
    tokenKey,
    { platform }
  );
  return createSessionStore(secureStorage, tokenKey, userKey);
};

export const sessionStorage = createStorageManager();

