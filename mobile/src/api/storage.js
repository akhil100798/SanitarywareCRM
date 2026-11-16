import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createSessionStore } from '../utils/sessionStore';
import { createSecureSessionStorage } from '../utils/secureSessionStorage';

const TOKEN_KEY = 'sanitaryware_crm_token';
const USER_KEY = 'sanitaryware_crm_user';

// Web session storage adapter for Expo Web target
const webStorage = {
  getItem: (key) => {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) {
        return Promise.resolve(globalThis.sessionStorage.getItem(key));
      }
    } catch { /* fallback to AsyncStorage */ }
    return AsyncStorage.getItem(key);
  },
  setItem: (key, value) => {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) {
        globalThis.sessionStorage.setItem(key, value);
        return Promise.resolve();
      }
    } catch { /* fallback to AsyncStorage */ }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key) => {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) {
        globalThis.sessionStorage.removeItem(key);
      }
    } catch { /* fallback to AsyncStorage */ }
    return AsyncStorage.removeItem(key);
  }
};

const tokenStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;

const secureSessionStorage = createSecureSessionStorage(
  Platform.OS === 'web' ? null : SecureStore,
  tokenStorage,
  TOKEN_KEY,
  { platform: Platform.OS }
);

export const sessionStorage = createSessionStore(secureSessionStorage, TOKEN_KEY, USER_KEY);
