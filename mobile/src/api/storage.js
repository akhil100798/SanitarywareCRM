import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createSessionStore } from '../utils/sessionStore';
import { createSecureSessionStorage } from '../utils/secureSessionStorage';

const TOKEN_KEY = 'sanitaryware_crm_token';
const USER_KEY = 'sanitaryware_crm_user';

const secureSessionStorage = createSecureSessionStorage(SecureStore, AsyncStorage, TOKEN_KEY);

export const sessionStorage = createSessionStore(secureSessionStorage, TOKEN_KEY, USER_KEY);
