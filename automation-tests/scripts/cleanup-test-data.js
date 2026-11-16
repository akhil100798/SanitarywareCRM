const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8081';
const MANIFEST_PATH = path.join(__dirname, '..', '.fixtures-manifest.json');

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Accept': 'application/json',
        ...(data ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let bodyText = '';
      res.on('data', (chunk) => bodyText += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: bodyText });
        } else if (res.statusCode === 404) {
          // Entity already removed or not found — acceptable during cleanup
          resolve({ status: 404, body: bodyText });
        } else {
          const err = new Error(`${method} ${path} failed with HTTP ${res.statusCode}: ${bodyText}`);
          err.statusCode = res.statusCode;
          err.body = bodyText;
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

const deleteRequest = (path, token = null) => request('DELETE', path, null, token);
const postJson = (path, body, token = null) => request('POST', path, body, token);
const getJson = (path, token = null) => request('GET', path, null, token).then(r => r.body ? JSON.parse(r.body) : null);

const runCleanup = async () => {
  try {
    console.log('Cleaning up test data records...');

    // 1. Authenticate to get token
    const loginResponse = await postJson('/api/auth/login', {
      username: 'qaadmin',
      password: 'Password@123'
    });
    const parsedLogin = JSON.parse(loginResponse.body);
    const token = parsedLogin.token;

    let cleanedCount = 0;

    // 2. Prefer manifest-guided cleanup
    if (fs.existsSync(MANIFEST_PATH)) {
      console.log(`Found fixture manifest: ${MANIFEST_PATH}`);
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
      const entities = Array.isArray(manifest.createdEntities) ? manifest.createdEntities : [];

      // Delete in reverse order of creation (e.g. products/customers/distributors before categories/brands)
      const reverseEntities = [...entities].reverse();
      for (const entity of reverseEntities) {
        if (!entity.path) continue;
        console.log(`Deleting tracked ${entity.type} at ${entity.path}...`);
        const res = await deleteRequest(entity.path, token);
        if (res.status === 404) {
          console.log(`  -> Already cleaned up (HTTP 404)`);
        } else {
          console.log(`  -> Cleaned up successfully (HTTP ${res.status})`);
          cleanedCount++;
        }
      }

      fs.unlinkSync(MANIFEST_PATH);
      console.log('Fixture manifest removed.');
    } else {
      console.log('No fixture manifest found. Performing targeted cleanup of known test records by natural keys...');

      const toArray = (obj) => {
        if (!obj) return [];
        if (Array.isArray(obj)) return obj;
        if (Array.isArray(obj.content)) return obj.content;
        return [];
      };

      // Find and delete customer with phone 9123456789
      const customers = await getJson('/api/customers', token).catch(() => []);
      for (const cust of toArray(customers)) {
        if (cust.phoneNumber === '9123456789' || cust.name === 'Ramesh Sharma') {
          console.log(`Deleting test customer ${cust.name} (ID: ${cust.id})...`);
          await deleteRequest(`/api/customers/${cust.id}`, token);
          cleanedCount++;
        }
      }

      // Find and delete distributor with phone 8881234567
      const distributors = await getJson('/api/distributors', token).catch(() => []);
      for (const dist of toArray(distributors)) {
        if (dist.phoneNumber === '8881234567' || dist.name === 'QA Distributor Supply') {
          console.log(`Deleting test distributor ${dist.name} (ID: ${dist.id})...`);
          await deleteRequest(`/api/distributors/${dist.id}`, token);
          cleanedCount++;
        }
      }

      // Find and delete product with SKU E2E-TEST-SKU
      const products = await getJson('/api/products', token).catch(() => []);
      for (const prod of toArray(products)) {
        if (prod.sku === 'E2E-TEST-SKU') {
          console.log(`Deleting test product ${prod.name} (ID: ${prod.id})...`);
          await deleteRequest(`/api/products/${prod.id}`, token);
          cleanedCount++;
        }
      }

      // Find and delete category E2E Category Pipes
      const categories = await getJson('/api/categories', token).catch(() => []);
      for (const cat of toArray(categories)) {
        if (cat.name === 'E2E Category Pipes') {
          console.log(`Deleting test category ${cat.name} (ID: ${cat.id})...`);
          await deleteRequest(`/api/categories/${cat.id}`, token);
          cleanedCount++;
        }
      }

      // Find and delete brand E2E Brand Supreme
      const brands = await getJson('/api/brands', token).catch(() => []);
      for (const b of toArray(brands)) {
        if (b.name === 'E2E Brand Supreme') {
          console.log(`Deleting test brand ${b.name} (ID: ${b.id})...`);
          await deleteRequest(`/api/brands/${b.id}`, token);
          cleanedCount++;
        }
      }
    }

    console.log(`Test data cleanup completed successfully (${cleanedCount} records processed).`);
    process.exit(0);
  } catch (err) {
    console.error(`Cleanup failed: ${err.message}`);
    process.exit(1);
  }
};

runCleanup();
