const fs = require('fs');
const { request } = require('@playwright/test');

const PDF_PATH = 'C:\\Users\\akhil\\Desktop\\Workspace\\New folder\\products\\Final JBD Pricelist June  Edition - 03.06.26 High -Res.pdf';

async function run() {
  console.log('--- Step 1: Logging in as admin ---');
  const apiContext = await request.newContext({ baseURL: 'http://localhost:80/api/' });
  const loginRes = await apiContext.post('auth/login', {
    data: { username: 'admin', password: 'admin123' }
  });
  if (!loginRes.ok()) throw new Error('Login failed: ' + await loginRes.text());
  const { token } = await loginRes.json();
  console.log('✓ Logged in.');

  const authContext = await request.newContext({
    baseURL: 'http://localhost:80/api/',
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    timeout: 300000
  });

  console.log('--- Step 2: Getting jhonson brand (ID: 59) ---');
  const brandsRes = await authContext.get('brands');
  const brands = await brandsRes.json();
  const brand = brands.find(b => b.id === 59 || b.name.toLowerCase().includes('jhonson') || b.name.toLowerCase().includes('johnson'));
  if (!brand) throw new Error('Brand not found');
  console.log(`✓ Brand: ${brand.name} (ID: ${brand.id})`);

  console.log('--- Step 3: Sending bulk-catalog-preview ---');
  const fileBuffer = fs.readFileSync(PDF_PATH);
  console.log(`PDF File size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  const t0 = Date.now();
  const previewRes = await authContext.post('products/bulk-catalog-preview', {
    multipart: {
      file: {
        name: 'Final JBD Pricelist June Edition.pdf',
        mimeType: 'application/pdf',
        buffer: fileBuffer
      },
      brandId: String(brand.id)
    }
  });

  const previewDuration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Preview response status: ${previewRes.status()} (took ${previewDuration}s)`);
  if (!previewRes.ok()) {
    console.error('Preview error:', await previewRes.text());
    process.exit(1);
  }

  const previewData = await previewRes.json();
  console.log('\n=== PREVIEW RESULT ===');
  console.log(`Page Count: ${previewData.pageCount}`);
  console.log(`Candidate Count: ${previewData.candidateCount}`);
  console.log(`Create Count: ${previewData.createCount}`);
  console.log(`Update Count: ${previewData.updateCount}`);
  console.log(`Conflict Count: ${previewData.conflictCount}`);
  console.log(`Rejected Count: ${previewData.rejectedCount}`);
  console.log(`Import Allowed: ${previewData.importAllowed}`);
  console.log(`SHA256: ${previewData.sha256}`);
  console.log(`Warnings Count: ${previewData.warnings ? previewData.warnings.length : 0}`);

  const withImages = previewData.items ? previewData.items.filter(i => i.hasImage).length : 0;
  const withPreviewUrl = previewData.items ? previewData.items.filter(i => i.imagePreviewUrl).length : 0;
  console.log(`Items with Images: ${withImages} / ${previewData.items.length}`);
  console.log(`Items with Preview URL: ${withPreviewUrl} / ${previewData.items.length}`);

  console.log('\n--- First 10 Candidate Items ---');
  previewData.items.slice(0, 10).forEach((item, idx) => {
    console.log(`  [${idx+1}] SKU: "${item.sku}" | Name: "${item.name}" | MRP: ₹${item.proposedMrp} | Page: ${item.sourcePage} | HasImage: ${item.hasImage}`);
  });

  console.log('\n--- Step 4: Executing bulk-catalog-upload (Confirm and Import) ---');
  const t1 = Date.now();
  
  // Prepare multipart form
  const multipartData = {
    file: {
      name: 'Final JBD Pricelist June Edition.pdf',
      mimeType: 'application/pdf',
      buffer: fileBuffer
    },
    brandId: String(brand.id),
    previewSha256: previewData.sha256,
    confirmed: 'true'
  };

  // Add selectedSkus
  previewData.items.forEach(item => {
    // Playwright multipart array handling
  });

  const uploadRes = await authContext.post('products/bulk-catalog-upload', {
    multipart: {
      file: {
        name: 'Final JBD Pricelist June Edition.pdf',
        mimeType: 'application/pdf',
        buffer: fileBuffer
      },
      brandId: String(brand.id),
      previewSha256: previewData.sha256,
      confirmed: 'true'
    }
  });

  const uploadDuration = ((Date.now() - t1) / 1000).toFixed(1);
  console.log(`Upload response status: ${uploadRes.status()} (took ${uploadDuration}s)`);
  if (!uploadRes.ok()) {
    console.error('Upload error:', await uploadRes.text());
    process.exit(1);
  }

  const uploadResult = await uploadRes.json();
  console.log('\n=== UPLOAD RESULT ===');
  console.log(JSON.stringify(uploadResult, null, 2));

  console.log('\n--- Step 5: Verifying Products in DB via API ---');
  const prodRes = await authContext.get('products?size=20');
  const prodPage = await prodRes.json();
  console.log(`Total Products in CRM: ${prodPage.totalElements}`);
  if (prodPage.content && prodPage.content.length > 0) {
    console.log('Sample imported products from catalog:');
    prodPage.content.slice(0, 5).forEach((p, idx) => {
      console.log(`  [${idx+1}] SKU: "${p.sku}" | Name: "${p.name}" | MRP: ₹${p.mrp} | PrimaryImage: ${p.primaryImageUrl || 'None'}`);
    });
  }

  console.log('\n✓ SUCCESS: Johnson catalog imported successfully into CRM!');
}

run().catch(console.error);
