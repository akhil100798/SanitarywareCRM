const { devices } = require('@playwright/test');

const mobileViewportConfig = {
  ...devices['Pixel 5'],
  baseURL: process.env.MOBILE_WEB_URL || 'http://localhost:8081',
  video: 'retain-on-failure',
  screenshot: 'only-on-failure'
};

module.exports = { mobileViewportConfig };
