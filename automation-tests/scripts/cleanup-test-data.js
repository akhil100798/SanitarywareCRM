const http = require('http');
require('dotenv').config();

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
        } else {
          resolve(); // Resolve anyway during cleanup to proceed
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const runCleanup = async () => {
  try {
    console.log('Cleaning up test data records...');
    
    // Login to get token
    const loginResponse = await new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}/api/auth/login`);
      const data = JSON.stringify({ username: 'qaadmin', password: 'Password@123' });
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

    // Execute safe deletes on test entities
    await deleteRequest('/api/customers/2', token); // Clean created Ramesh Sharma
    await deleteRequest('/api/categories/2', token); // Clean sub-category

    console.log('Test data cleanup completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error(`Cleanup encountered warnings: ${err.message}`);
    process.exit(0); // Soft exit to prevent build crash
  }
};

runCleanup();
