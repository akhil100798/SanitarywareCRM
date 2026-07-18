const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

const bugHuntRequested = process.argv.some((argument) => argument.includes('bug-hunt'));
const releaseSpecMatch = /(?:api|frontend|security|database)[\\/]specs[\\/].*\.spec\.js/;
const bugHuntSpecMatch = /(?:api|frontend|security)[\\/]bug-hunt[\\/].*\.spec\.js/;

module.exports = defineConfig({
  testDir: '.',
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { outputFolder: 'reports' }]],
  use: {
    baseURL: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: bugHuntRequested ? bugHuntSpecMatch : releaseSpecMatch
    },
    {
      name: 'Mobile Chrome (Pixel 5)',
      use: { ...devices['Pixel 5'] },
      testMatch: /mobile[\\/]specs[\\/].*\.spec\.js/
    },
    {
      name: 'Mobile Safari (iPhone 13)',
      use: { ...devices['iPhone 13'] },
      testMatch: /mobile[\\/]specs[\\/].*\.spec\.js/
    }
  ]
});
