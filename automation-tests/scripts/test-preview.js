const fs = require('fs');
async function test() {
  const loginRes = await fetch('http://127.0.0.1/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();
  const fileBuffer = fs.readFileSync('C:\\Users\\akhil\\Desktop\\Workspace\\New folder\\products\\【Split】 DOC-20260724-WA0015.pdf');
  const boundary = '----WebKitFormBoundary123456';
  const previewBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="brandId"\r\n\r\n105\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="catalog.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);
  const res = await fetch('http://127.0.0.1/api/products/bulk-catalog-preview', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: previewBody
  });
  const data = await res.json();
  console.log('Preview status:', res.status);
  console.log('Keys:', Object.keys(data));
  console.log('sha256:', data.sha256);
  console.log('candidateCount:', data.candidateCount);
  console.log('Items length:', data.items?.length);
  if (data.items?.length > 0) {
    console.log('Sample item 0:', JSON.stringify(data.items[0], null, 2));
    console.log('SKUs:', data.items.map(i => i.sku));
  }
  console.log('Preview items prices:', data.items.map(i => ({ sku: i.sku, mrp: i.proposedMrp, name: i.name.slice(0, 30) })));
}
test().catch(console.error);
