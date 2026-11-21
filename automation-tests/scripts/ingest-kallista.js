const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = 'C:\\Users\\akhil\\Desktop\\Workspace\\New folder\\products';
const CATALOG_PDF = path.join(PRODUCTS_DIR, '【Split】 DOC-20260724-WA0015.pdf');
const API_BASE = 'http://127.0.0.1/api';

async function ingest() {
  console.log('Authenticating admin...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  const brandId = 106;
  console.log(`Ingesting catalog for Brand ID ${brandId}...`);
  const fileBuffer = fs.readFileSync(CATALOG_PDF);

  // 1. Preview
  console.log('1. Previewing catalog upload...');
  const previewBoundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
  const previewBody = Buffer.concat([
    Buffer.from(`--${previewBoundary}\r\nContent-Disposition: form-data; name="brandId"\r\n\r\n${brandId}\r\n`),
    Buffer.from(`--${previewBoundary}\r\nContent-Disposition: form-data; name="file"; filename="catalog.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${previewBoundary}--\r\n`)
  ]);

  const previewRes = await fetch(`${API_BASE}/products/bulk-catalog-preview`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': `multipart/form-data; boundary=${previewBoundary}` },
    body: previewBody
  });
  if (!previewRes.ok) throw new Error(`Preview failed: ${previewRes.status} ${await previewRes.text()}`);
  const previewData = await previewRes.json();
  console.log(`Preview succeeded: candidateCount=${previewData.candidateCount}, sha256=${previewData.sha256}`);

  // 2. Commit upload
  console.log('2. Committing bulk catalog upload...');
  const commitBoundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
  const commitBody = Buffer.concat([
    Buffer.from(`--${commitBoundary}\r\nContent-Disposition: form-data; name="brandId"\r\n\r\n${brandId}\r\n`),
    Buffer.from(`--${commitBoundary}\r\nContent-Disposition: form-data; name="previewSha256"\r\n\r\n${previewData.sha256}\r\n`),
    Buffer.from(`--${commitBoundary}\r\nContent-Disposition: form-data; name="confirmed"\r\n\r\ntrue\r\n`),
    Buffer.from(`--${commitBoundary}\r\nContent-Disposition: form-data; name="file"; filename="catalog.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${commitBoundary}--\r\n`)
  ]);

  const commitRes = await fetch(`${API_BASE}/products/bulk-catalog-upload`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': `multipart/form-data; boundary=${commitBoundary}` },
    body: commitBody
  });
  if (!commitRes.ok) throw new Error(`Upload failed: ${commitRes.status} ${await commitRes.text()}`);
  const commitResult = await commitRes.json();
  console.log(`Commit succeeded: ${commitResult.createdCount} created, ${commitResult.totalProcessed} processed!`);

  // 3. Attach catalog to brand entity
  console.log('3. Attaching catalog to brand entity...');
  const attachBoundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
  const attachBody = Buffer.concat([
    Buffer.from(`--${attachBoundary}\r\nContent-Disposition: form-data; name="file"; filename="catalog_ashirwad.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${attachBoundary}--\r\n`)
  ]);
  const attachRes = await fetch(`${API_BASE}/brands/${brandId}/catalog`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': `multipart/form-data; boundary=${attachBoundary}` },
    body: attachBody
  });
  if (!attachRes.ok) throw new Error(`Attach failed: ${attachRes.status} ${await attachRes.text()}`);
  const attachData = await attachRes.json();
  console.log(`Brand updated with catalog: ${attachData.catalogFileName}`);
}

ingest().catch(console.error);
