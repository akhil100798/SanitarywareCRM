const { request } = require('@playwright/test');
require('dotenv').config();

const getClient = async (token = null) => {
  return await request.newContext({
    baseURL: process.env.BACKEND_BASE_URL || 'http://localhost:8081',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
};

module.exports = { getClient };
