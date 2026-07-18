const http = require('http');
require('dotenv').config();

const BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8081';

const postJson = (path, body, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const data = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let bodyText = '';
      res.on('data', (chunk) => bodyText += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(bodyText ? JSON.parse(bodyText) : null);
        } else {
          reject(new Error(`POST ${path} failed with ${res.statusCode}: ${bodyText}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const runSeeding = async () => {
  try {
    console.log('Seeding initial test data...');
    
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

    // 2. Create Brand
    const brand = await postJson('/api/brands', { name: 'E2E Brand Supreme' }, token).catch(err => {
      console.log('Brand might already exist, skipping: ' + err.message);
      return { name: 'E2E Brand Supreme', id: 1 };
    });
    console.log(`Created Brand: ${brand.name} (ID: ${brand.id})`);

    // 3. Create Category
    const category = await postJson('/api/categories', { name: 'E2E Category Pipes' }, token).catch(err => {
      console.log('Category might already exist, skipping: ' + err.message);
      return { name: 'E2E Category Pipes', id: 1 };
    });
    console.log(`Created Category: ${category.name} (ID: ${category.id})`);

    // 3.5. Create Product
    const product = await postJson('/api/products', {
      sku: 'E2E-TEST-SKU',
      name: 'E2E Automated Pipe',
      description: 'Standard test PVC conduit',
      mrp: 250.00,
      sellingPrice: 220.00,
      stockQuantity: 100,
      reorderLevel: 5,
      categoryId: category.id,
      brandId: brand.id
    }, token).catch(err => {
      console.log('Product might already exist, skipping: ' + err.message);
      return { name: 'E2E Automated Pipe', id: 'existing' };
    });
    console.log(`Created Product: ${product.name} (ID: ${product.id})`);

    // 4. Create Customer
    const customer = await postJson('/api/customers', {
      name: 'Ramesh Sharma',
      phoneNumber: '9123456789',
      customerType: 'RETAIL'
    }, token).catch(err => {
      console.log('Customer might already exist, skipping: ' + err.message);
      return { name: 'Ramesh Sharma', id: 1 };
    });
    console.log(`Created Customer: ${customer.name} (ID: ${customer.id})`);

    // 5. Create Distributor
    const distributor = await postJson('/api/distributors', {
      name: 'QA Distributor Supply',
      phoneNumber: '8881234567'
    }, token).catch(err => {
      console.log('Distributor might already exist, skipping: ' + err.message);
      return { name: 'QA Distributor Supply', id: 1 };
    });
    console.log(`Created Distributor: ${distributor.name} (ID: ${distributor.id})`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
};

runSeeding();
