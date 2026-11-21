const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;
const isWebLocalhost =
  typeof window !== 'undefined' &&
  window.location &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL =
  configuredApiBaseUrl || (isWebLocalhost ? '/api' : 'http://10.0.2.2:8081/api');

if (
  !isDevelopment &&
  configuredApiBaseUrl &&
  !API_BASE_URL.startsWith('https://') &&
  !API_BASE_URL.includes('10.0.2.2') &&
  !isWebLocalhost
) {
  throw new Error('Production mobile builds require an HTTPS API URL.');
}
