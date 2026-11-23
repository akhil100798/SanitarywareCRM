import axios from 'axios';
import { API_BASE_URL } from './config.js';
import { sessionStorage } from './storage.js';

export const createApiClient = (baseURL = API_BASE_URL, storage = sessionStorage) => {
  const instance = axios.create({
    baseURL,
    timeout: 20000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  instance.interceptors.request.use(async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      config.timeout = 180000;
    }
    return config;
  });

  instance.interceptors.response.use((response) => response, async (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      const authorization = error.config?.headers?.Authorization;
      if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
        await storage.rejectToken(authorization.slice(7));
      }
    }
    return Promise.reject(error);
  });

  return instance;
};

export const api = createApiClient();

export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message === 'Network Error') {
    return 'Cannot reach the CRM server. Check the mobile API URL and backend status.';
  }
  return error.message || 'Something went wrong';
};
