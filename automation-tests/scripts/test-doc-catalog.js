const fs = require('fs');
const { request } = require('@playwright/test');

const PDF_PATH = 'C:\\Users\\akhil\\Desktop\\Workspace\\New folder\\products\\【Split】 DOC-20260724-WA0015.pdf';

async function main() {
  console.log('Logging in...');
  const apiContext = await request.newContext({ baseURL: 'http://localhost:80/api/' });
  const loginRes = await apiContext.post('auth/login', {
    data: { username: 'admin', password: 'admin123' }
  });
  const { token } = await loginRes.json();
  console.log('Logged in.');

  const authContext = await request.newContext({
    baseURL: 'http://localhost:80/api/',
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    timeout: 300000
  });

  const fileBuffer = fs.readFileSync(PDF_PATH);
  console.log(`PDF Size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  console.log('Sending bulk-catalog-preview request...');
  const t0 = Date.now();
  const res = await authContext.post('products/bulk-catalog-preview', {
    multipart: {
      file: {
        name: 'DOC-20260724-WA0015.pdf',
        mimeType: 'application/pdf',
        buffer: fileBuffer
      },
      brandId: '60'
    }
  });

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Status: ${res.status()} (took ${duration}s)`);
  if (!res.ok()) {
    console.error('Error:', await res.text());
    return;
  }

  const data = await res.json();
  console.log('\n--- PREVIEW SUMMARY ---');
  console.log('Brand:', data.brandName);
  console.log('Total Pages:', data.totalPages);
  console.log('Candidates:', data.candidateCount);
  console.log('Creates:', data.creates);
  console.log('Updates:', data.updates);
  console.log('Conflicts:', data.conflicts);
  console.log('Rejected:', data.rejected);
  console.log('Warnings count:', data.warnings ? data.warnings.length : 0);
  if (data.warnings && data.warnings.length > 0) {
    console.log('First 5 warnings:');
    data.warnings.slice(0, 5).forEach((w, i) => console.log(`  [${i+1}] ${w}`));
  }

  const itemsWithImages = data.items ? data.items.filter(i => i.hasImage).length : 0;
  console.log(`Items with images: ${itemsWithImages} / ${data.items ? data.items.length : 0}`);

  if (data.items && data.items.length > 0) {
    console.log('\nSample 10 items:');
    data.items.slice(0, 10).forEach((item, idx) => {
      console.log(`  [${idx + 1}] SKU: "${item.sku}" | Name: "${item.name}" | MRP: ₹${item.proposedMrp} | Page: ${item.sourcePage} | HasImage: ${item.hasImage} | HSN: ${item.hsnCode} | Material: ${item.material}`);
    });
  }
}

main().catch(console.error);
