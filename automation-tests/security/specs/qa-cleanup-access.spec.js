const { test, expect } = require('@playwright/test');
const { getClient } = require('../../api/helpers/apiClient');
const { getAdminToken, getManagerToken, getSalesToken, getWarehouseToken } = require('../../api/helpers/authHelper');
const fixturePath = '/api/qa/quotations/999999999?customerName=Phase%201%20Customer%20123';
const catalogueCleanupPath = '/api/qa/catalogue-imports/qa-batch-security-check';

test('QA cleanup requires authentication before looking up fixtures', async () => {
  const client = await getClient();
  expect((await client.delete(fixturePath)).status()).toBe(401);
});
test('non-admin roles cannot invoke QA fixture cleanup', async () => {
  for (const getToken of [getManagerToken, getSalesToken, getWarehouseToken]) {
    const client = await getClient(await getToken());
    expect((await client.delete(fixturePath)).status()).toBe(403);
  }
});
test('catalogue cleanup requires authentication and is restricted to admins', async () => {
  const anonymous = await getClient();
  try { expect((await anonymous.delete(catalogueCleanupPath)).status()).toBe(401); }
  finally { await anonymous.dispose(); }
  for (const getToken of [getManagerToken, getSalesToken, getWarehouseToken]) {
    const client = await getClient(await getToken());
    try { expect((await client.delete(catalogueCleanupPath)).status()).toBe(403); }
    finally { await client.dispose(); }
  }
  const admin = await getClient(await getAdminToken());
  try {
    const response = await admin.delete(catalogueCleanupPath);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ batchId: 'qa-batch-security-check', deactivatedProducts: 0, removedImageLinks: 0, pendingImageCleanup: 0 });
  } finally { await admin.dispose(); }
});
