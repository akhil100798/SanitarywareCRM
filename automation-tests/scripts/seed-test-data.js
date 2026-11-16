const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8081';
const MANIFEST_PATH = path.join(__dirname, '..', '.fixtures-manifest.json');

const requestJson = (method, path, body = null, token = null) => {
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
          try {
            resolve(bodyText ? JSON.parse(bodyText) : null);
          } catch (e) {
            resolve(null);
          }
        } else {
          const err = new Error(`${method} ${path} failed with ${res.statusCode}: ${bodyText}`);
          err.statusCode = res.statusCode;
          err.responseBody = bodyText;
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

const postJson = (path, body, token = null) => requestJson('POST', path, body, token);
const getJson = (path, token = null) => requestJson('GET', path, null, token);

const runSeeding = async () => {
  try {
    console.log('Seeding initial test data...');
    const createdEntities = [];
    
    // 1. Authenticate to get token (with self-healing fallback)
    let token;
    try {
      const loginResponse = await postJson('/api/auth/login', {
        username: 'qaadmin',
        password: 'Password@123'
      });
      token = loginResponse.token;
    } catch (err) {
      console.log('Admin login failed, registering admin user first...');
      await postJson('/api/auth/register', {
        username: 'qaadmin',
        password: 'Password@123',
        email: 'qaadmin@test.com',
        fullName: 'QA Admin User',
        phoneNumber: '9000000001'
      });
      const loginResponse = await postJson('/api/auth/login', {
        username: 'qaadmin',
        password: 'Password@123'
      });
      token = loginResponse.token;
    }
    console.log('Successfully authenticated as admin.');

    const getItems = (res) => Array.isArray(res) ? res : (res?.content || []);

    // 2. Create Brand
    let brand;
    try {
      brand = await postJson('/api/brands', { name: 'E2E Brand Supreme' }, token);
      createdEntities.push({ type: 'brand', id: brand.id, path: `/api/brands/${brand.id}` });
      console.log(`Created Brand: ${brand.name} (ID: ${brand.id})`);
    } catch (err) {
      const brands = await getJson('/api/brands', token).catch(() => []);
      brand = getItems(brands).find(b => b.name === 'E2E Brand Supreme') || { name: 'E2E Brand Supreme', id: 1 };
      console.log(`Reusing Brand: ${brand.name} (ID: ${brand.id})`);
    }

    // 3. Create Category
    let category;
    try {
      category = await postJson('/api/categories', { name: 'E2E Category Pipes' }, token);
      createdEntities.push({ type: 'category', id: category.id, path: `/api/categories/${category.id}` });
      console.log(`Created Category: ${category.name} (ID: ${category.id})`);
    } catch (err) {
      const categories = await getJson('/api/categories', token).catch(() => []);
      category = getItems(categories).find(c => c.name === 'E2E Category Pipes') || { name: 'E2E Category Pipes', id: 1 };
      console.log(`Reusing Category: ${category.name} (ID: ${category.id})`);
    }

    // 3.5. Create Product
    let product;
    try {
      product = await postJson('/api/products', {
        sku: 'E2E-TEST-SKU',
        name: 'E2E Automated Pipe',
        description: 'Standard test PVC conduit',
        mrp: 250.00,
        sellingPrice: 220.00,
        stockQuantity: 100,
        reorderLevel: 5,
        categoryId: category.id,
        brandId: brand.id
      }, token);
      createdEntities.push({ type: 'product', id: product.id, path: `/api/products/${product.id}` });
      console.log(`Created Product: ${product.name} (ID: ${product.id})`);
    } catch (err) {
      const products = await getJson('/api/products', token).catch(() => []);
      product = getItems(products).find(p => p.sku === 'E2E-TEST-SKU') || { name: 'E2E Automated Pipe', id: 'existing' };
      console.log(`Reusing Product: ${product.name} (ID: ${product.id})`);
    }

    // 4. Create Customer
    let customer;
    try {
      customer = await postJson('/api/customers', {
        name: 'Ramesh Sharma',
        phoneNumber: '9123456789',
        customerType: 'RETAIL'
      }, token);
      createdEntities.push({ type: 'customer', id: customer.id, path: `/api/customers/${customer.id}` });
      console.log(`Created Customer: ${customer.name} (ID: ${customer.id})`);
    } catch (err) {
      const customers = await getJson('/api/customers', token).catch(() => []);
      customer = getItems(customers).find(c => c.phoneNumber === '9123456789') || { name: 'Ramesh Sharma', id: 1 };
      console.log(`Reusing Customer: ${customer.name} (ID: ${customer.id})`);
    }

    // 5. Create Distributor
    let distributor;
    try {
      distributor = await postJson('/api/distributors', {
        name: 'QA Distributor Supply',
        phoneNumber: '8881234567'
      }, token);
      createdEntities.push({ type: 'distributor', id: distributor.id, path: `/api/distributors/${distributor.id}` });
      console.log(`Created Distributor: ${distributor.name} (ID: ${distributor.id})`);
    } catch (err) {
      const distributors = await getJson('/api/distributors', token).catch(() => []);
      distributor = getItems(distributors).find(d => d.phoneNumber === '8881234567') || { name: 'QA Distributor Supply', id: 1 };
      console.log(`Reusing Distributor: ${distributor.name} (ID: ${distributor.id})`);
    }

    // 6. Record run-owned fixtures in manifest for deterministic cleanup
    const manifest = {
      seededAt: new Date().toISOString(),
      fixtures: {
        brandId: brand.id,
        categoryId: category.id,
        productId: product.id,
        customerId: customer.id,
        distributorId: distributor.id
      },
      createdEntities
    };
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`Fixture manifest saved with ${createdEntities.length} tracked entities: ${MANIFEST_PATH}`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
};

runSeeding();
