import axios from 'axios';
import { API_BASE_URL } from './config';
import { sessionStorage } from './storage';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config) => {
  const token = await sessionStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message === 'Network Error') {
    return 'Cannot reach the CRM server. Check the mobile API URL and backend status.';
  }
  return error.message || 'Something went wrong';
};
