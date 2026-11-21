const fs = require('fs');

async function test() {
  const loginRes = await fetch('http://localhost:8081/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();

  const brandsRes = await fetch('http://localhost/api/brands', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const brands = await brandsRes.json();
  const brand = brands.find(b => b.name && b.name.toLowerCase().includes('jhon')) || brands[0];
  console.log('Testing upload to brand ID:', brand.id, 'Name:', brand.name);

  // Generate a dummy large PDF buffer (e.g. 15MB or 35MB) to test the 413 fix
  const header = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n';
  const padding = ' '.repeat(35 * 1024 * 1024); // 35MB dummy data
  const trailer = '\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n';
  const largePdf = Buffer.from(header + padding + trailer, 'latin1');

  console.log(`Generated test PDF size: ${(largePdf.length / (1024 * 1024)).toFixed(2)} MB`);

  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_catalog.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    largePdf,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadRes = await fetch(`http://localhost/api/brands/${brand.id}/catalog`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  });

  console.log('Upload HTTP Status:', uploadRes.status);
  const resText = await uploadRes.text();
  console.log('Response body:', resText.substring(0, 300));
}

test().catch(console.error);
