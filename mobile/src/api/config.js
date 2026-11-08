const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

if (!configuredApiBaseUrl && !isDevelopment) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL must be set for production builds.');
}

export const API_BASE_URL = configuredApiBaseUrl || 'http://10.0.2.2:8081/api';

if (!isDevelopment && !API_BASE_URL.startsWith('https://')) {
  throw new Error('Production mobile builds require an HTTPS API URL.');
}
