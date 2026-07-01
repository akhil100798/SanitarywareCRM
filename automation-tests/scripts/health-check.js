const http = require('http');
require('dotenv').config();

const url = `${process.env.BACKEND_BASE_URL || 'http://localhost:8081'}/api/health`;

console.log(`Checking backend health at: ${url}...`);

http.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const status = JSON.parse(data);
      if (res.statusCode === 200 && status.status === 'UP') {
        console.log('Backend is UP and healthy!');
        process.exit(0);
      } else {
        console.error(`Backend health check failed. Status: ${res.statusCode}, Body: ${data}`);
        process.exit(1);
      }
    } catch (e) {
      console.error(`Invalid health check response: ${data}`);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error(`Failed to connect to backend: ${err.message}`);
  process.exit(1);
});
