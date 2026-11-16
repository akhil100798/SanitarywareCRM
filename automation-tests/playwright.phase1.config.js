const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './phase1',
  testMatch: 'financial-workflows.spec.js',
  globalSetup: require.resolve('./phase1/setup.js'),
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: [['list'], ['json', { outputFile: '../audit-artifacts/phase1-client-results.json' }]],
  outputDir: './test-results/phase1',
  use: { baseURL: process.env.PHASE1_FRONTEND_URL || 'http://localhost:5181', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
