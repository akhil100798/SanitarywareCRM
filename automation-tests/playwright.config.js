const { defineConfig, devices } = require('@playwright/test');
const path = require('path');
require('dotenv').config();

const bugHuntRequested = process.argv.some((argument) => argument.includes('bug-hunt'));
const matrixRequested = process.argv.some((argument) => argument.includes('matrix'));
const releaseSpecMatch = /(?:api|frontend|security|database)[\\/]specs[\\/].*\.spec\.js/;
const bugHuntSpecMatch = /(?:api|frontend|security)[\\/]bug-hunt[\\/].*\.spec\.js/;
const frontendMatrixSpecMatch = /frontend[\\/]matrix[\\/].*\.spec\.js/;
const mobileMatrixSpecMatch = /mobile[\\/]matrix[\\/].*\.spec\.js/;

module.exports = defineConfig({
  testDir: '.',
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { outputFolder: 'reports' }]],
  webServer: {
    command: 'cmd.exe /c "set NODE_OPTIONS=--max-old-space-size=4096 && npm run dev -- --host 127.0.0.1"',
    cwd: path.resolve(__dirname, '../frontend'),
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000
  },
  use: {
    baseURL: process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: matrixRequested
        ? frontendMatrixSpecMatch
        : (bugHuntRequested ? bugHuntSpecMatch : releaseSpecMatch)
    },
    {
      name: 'Mobile Chrome (Pixel 5)',
      use: { ...devices['Pixel 5'] },
      testMatch: matrixRequested ? mobileMatrixSpecMatch : /mobile[\\/]specs[\\/].*\.spec\.js/
    },
    {
      name: 'Mobile Safari (iPhone 13)',
      use: { ...devices['iPhone 13'] },
      testMatch: matrixRequested ? mobileMatrixSpecMatch : /mobile[\\/]specs[\\/].*\.spec\.js/
    }
  ]
});
