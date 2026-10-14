const http = require('http');
require('dotenv').config();
const { credentials } = require('../config/testCredentials');

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8081';

const deleteRequest = (path, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else if (res.statusCode === 404) {
          resolve({ alreadyAbsent: true }); // Explicitly requested owned ID, idempotent absence.
        } else {
          reject(new Error(`Cleanup deletion failed: HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const deleteCatalogueImports = (token, batchId) => new Promise((resolve, reject) => {
  if (!batchId || !/^[A-Za-z0-9_-]{1,64}$/.test(batchId)) {
    reject(new Error('A valid catalogue import batch ID is required for cleanup'));
    return;
  }
  const url = new URL(`${BASE_URL}/api/qa/catalogue-imports/${encodeURIComponent(batchId)}`);
  const req = http.request(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try { resolve(body ? JSON.parse(body) : {}); }
        catch { reject(new Error('Catalogue cleanup returned invalid JSON')); }
      } else {
        reject(new Error(`Catalogue cleanup failed: ${res.statusCode}`));
      }
    });
  });
  req.on('error', reject);
  req.end();
});

const runCleanup = async () => {
  try {
    console.log('Cleaning up test data records...');
    
    // Login to get token
    const loginResponse = await new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}/api/auth/login`);
      const data = JSON.stringify({ username: credentials.admin.username, password: credentials.admin.password });
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const req = http.request(options, (res) => {
        let bodyText = '';
        res.on('data', (chunk) => bodyText += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(bodyText));
          } else {
            reject(new Error(`Login failed during cleanup: ${res.statusCode}`));
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    const token = loginResponse.token;

    // Execute only scoped cleanup operations. IDs are supplied explicitly by a test run.
    const cleanupCustomerIds = (process.env.QA_CLEANUP_CUSTOMER_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
    const cleanupCategoryIds = (process.env.QA_CLEANUP_CATEGORY_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
    for (const id of cleanupCustomerIds) await deleteRequest(`/api/customers/${encodeURIComponent(id)}`, token);
    for (const id of cleanupCategoryIds) await deleteRequest(`/api/categories/${encodeURIComponent(id)}`, token);
    const catalogueBatchIds = [...new Set((process.env.QA_CATALOGUE_IMPORT_BATCH_IDS || '')
      .split(',').map(value => value.trim()).filter(Boolean))];
    if (catalogueBatchIds.some(id => !/^[A-Za-z0-9_-]{1,64}$/.test(id))) {
      throw new Error('QA_CATALOGUE_IMPORT_BATCH_IDS contains an invalid batch ID');
    }
    let deactivatedCatalogueProducts = 0;
    for (const batchId of catalogueBatchIds) {
      const result = await deleteCatalogueImports(token, batchId);
      deactivatedCatalogueProducts += result.deactivatedProducts || 0;
      if ((result.pendingImageCleanup || 0) > 0) {
        throw new Error(`Catalogue batch ${batchId} has ${result.pendingImageCleanup} pending image cleanup task(s); rerun cleanup after resolving storage errors`);
      }
    }

    console.log(`Test data cleanup completed successfully. Catalogue batches cleaned: ${catalogueBatchIds.length}; products deactivated: ${deactivatedCatalogueProducts}.`);
    process.exit(0);
  } catch (err) {
    console.error(`Cleanup failed: ${err.message}`);
    process.exitCode = 1;
  }
};

module.exports = { deleteRequest, deleteCatalogueImports, runCleanup };
if (require.main === module) runCleanup();
