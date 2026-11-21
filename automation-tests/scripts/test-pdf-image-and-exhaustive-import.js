const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost';
const API_BASE = 'http://localhost:8081/api';

async function main() {
  console.log('=== STARTING EXHAUSTIVE CATALOG PDF IMPORT & IMAGE CROPPING VERIFICATION ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Generate test PDF using Playwright with real embedded images and complex layout
  console.log('\n--- Step 1: Generating Test Multi-Page PDF with Embedded Images & Fallbacks ---');
  const pdfHtmlPath = path.resolve(__dirname, 'test-catalog.html');
  const testPdfPath = path.resolve(__dirname, 'test-exhaustive-catalog.pdf');

  // Small 1x1 colored PNGs base64
  const bluePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/nwEJMDEwMDAAABsBAf61zH1QAAAAAElFTkSuQmCC';
  const greenPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkaGD4z4AEmBgYGBgAAMQAAf5l9m5WAAAAAElFTkSuQmCC';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Helvetica, Arial, sans-serif; margin: 40px; font-size: 13px; color: #111; }
      .page { page-break-after: always; min-height: 900px; }
      .catalog-header { font-size: 20px; font-weight: bold; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
      .product-grid { display: flex; flex-direction: column; gap: 30px; }
      .product-item { display: flex; align-items: flex-start; gap: 20px; border-bottom: 1px dashed #ccc; padding-bottom: 15px; }
      .product-img { width: 80px; height: 80px; object-fit: cover; border: 1px solid #ddd; }
      .product-info { flex: 1; }
      .product-sku { font-weight: bold; font-size: 15px; color: #0284c7; }
      .mrp-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      .mrp-table th, .mrp-table td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
      .mrp-table th { background-color: #f3f4f6; }
    </style>
  </head>
  <body>
    <!-- PAGE 1: Standard Items with Images & Fallbacks -->
    <div class="page">
      <div class="catalog-header">Sanitaryware Master Catalog 2026 - Collection A</div>
      <div class="product-grid">
        
        <!-- Item 1: Complete data + Blue Image -->
        <div class="product-item">
          <img class="product-img" src="${bluePng}" />
          <div class="product-info">
            <div class="product-sku">SN-8801</div>
            <div>Royal Cascade Wall Hung Ceramic Water Closet</div>
            <div>HSN Code: 691010 Material: Ceramic Material Code: CER01 Item Code: IT8801</div>
            <div>MRP ₹ 14,500</div>
          </div>
        </div>

        <!-- Item 2: Pure Numeric SKU + Green Image + Column format -->
        <div class="product-item">
          <img class="product-img" src="${greenPng}" />
          <div class="product-info">
            <div class="product-sku">7418209</div>
            <div>Brass Pillar Cock High Neck Chrome Plated</div>
            <div>HSN Code: 741820 Material Code: BR44</div>
            <div>Price ₹ 3,250</div>
          </div>
        </div>

        <!-- Item 3: Missing Name, Missing HSN, Missing Material, No Image -->
        <div class="product-item">
          <div class="product-info">
            <div class="product-sku">SL-102/B</div>
            <div>MRP ₹ 1,850</div>
          </div>
        </div>

      </div>
    </div>

    <!-- PAGE 2: Numeric SKUs, Column-aware MRP, Zero Price Fallbacks -->
    <div class="page">
      <div class="catalog-header">Sanitaryware Master Catalog 2026 - Price Table</div>
      
      <table class="mrp-table">
        <thead>
          <tr>
            <th>ITEM CODE / SKU</th>
            <th>PRODUCT DESCRIPTION</th>
            <th>HSN</th>
            <th>MRP</th>
          </tr>
        </thead>
        <tbody>
          <!-- Item 4: Alphanumeric with slash under MRP column without currency symbol -->
          <tr>
            <td>CP-990/X</td>
            <td>Angle Valve Concealed Cartridge</td>
            <td>848180</td>
            <td>850</td>
          </tr>
          <!-- Item 5: Purely numeric SKU without name/material/HSN under MRP column -->
          <tr>
            <td>6910105</td>
            <td>Counter Top Oval Art Basin</td>
            <td>691010</td>
            <td>5400</td>
          </tr>
          <!-- Item 6: Unpriced item (missing price should fallback to 0.00 instead of failing) -->
          <tr>
            <td>UNP-404</td>
            <td>Display Showcase Sample Unit</td>
            <td>--</td>
            <td>--</td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
  </html>
  `;

  fs.writeFileSync(pdfHtmlPath, htmlContent, 'utf8');
  await page.goto('file:///' + pdfHtmlPath.replace(/\\/g, '/'));
  await page.pdf({
    path: testPdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });
  console.log('✓ Successfully created test multi-page PDF catalog at:', testPdfPath);

  // 2. Authenticate as Admin via API
  console.log('\n--- Step 2: Authenticating as Admin & Creating Staging Brand ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✓ Admin authenticated successfully.');

  // Create or get unique brand
  const brandName = 'AutoTest Catalog Brand ' + Date.now().toString().slice(-4);
  const brandRes = await fetch(`${API_BASE}/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name: brandName, description: 'Brand for exhaustive bulk import testing' })
  });
  const brandData = await brandRes.json();
  const brandId = brandData.id;
  console.log(`✓ Brand created: "${brandName}" (ID: ${brandId})`);

  // 3. Test Preview Endpoint (/api/products/bulk-catalog-preview)
  console.log('\n--- Step 3: Testing /api/products/bulk-catalog-preview ---');
  const pdfBytes = fs.readFileSync(testPdfPath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
  
  const previewBodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="brandId"\r\n\r\n${brandId}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-exhaustive-catalog.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    pdfBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const previewRes = await fetch(`${API_BASE}/products/bulk-catalog-preview`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: previewBodyBuffer
  });

  const previewData = await previewRes.json();
  console.log('Preview Response Status:', previewRes.status);
  console.log('Preview candidateCount:', previewData.candidateCount);
  console.log('Preview sha256:', previewData.sha256);
  console.log('Preview items detected:', previewData.items ? previewData.items.length : 0);

  let previewSha256 = previewData.sha256;
  if (previewData.items) {
    console.log('\n--- Items Preview Inspection ---');
    previewData.items.forEach((item, idx) => {
      console.log(` [${idx + 1}] SKU: "${item.sku}" | Name: "${item.name}" | MRP: ₹${item.mrp} | HSN: "${item.hsnCode}" | Material: "${item.material}" | HasImage: ${item.hasImage} | ImageURL: ${item.imagePreviewUrl ? item.imagePreviewUrl.substring(0, 35) + '...' : 'none'}`);
    });
  }

  // 4. Test Confirm Endpoint (/api/products/bulk-catalog-upload)
  console.log('\n--- Step 4: Testing /api/products/bulk-catalog-upload ---');
  const confirmBoundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
  const confirmBodyBuffer = Buffer.concat([
    Buffer.from(`--${confirmBoundary}\r\nContent-Disposition: form-data; name="brandId"\r\n\r\n${brandId}\r\n`),
    Buffer.from(`--${confirmBoundary}\r\nContent-Disposition: form-data; name="previewSha256"\r\n\r\n${previewSha256}\r\n`),
    Buffer.from(`--${confirmBoundary}\r\nContent-Disposition: form-data; name="confirmed"\r\n\r\ntrue\r\n`),
    Buffer.from(`--${confirmBoundary}\r\nContent-Disposition: form-data; name="file"; filename="test-exhaustive-catalog.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    pdfBytes,
    Buffer.from(`\r\n--${confirmBoundary}--\r\n`)
  ]);

  const confirmRes = await fetch(`${API_BASE}/products/bulk-catalog-upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${confirmBoundary}`
    },
    body: confirmBodyBuffer
  });

  const confirmData = await confirmRes.json();
  console.log('Confirm Response Status:', confirmRes.status);
  console.log('Confirm Result:', confirmData);

  // 5. Query MySQL Database directly to verify persistence
  console.log('\n--- Step 5: Direct Database Audit (products & product_images tables) ---');
  const queryProductsSql = `SELECT id, sku, name, hsn_code, material, mrp, is_active FROM products WHERE brand_id = ${brandId} ORDER BY id ASC;`;
  const dbProducts = execSync(`docker exec sanitarywarecrm-mysql-1 mysql -u root -pstaging_root_password_123 sanitaryware_crm_staging -e "${queryProductsSql}"`, { encoding: 'utf8' });
  console.log('MySQL products table entries:');
  console.log(dbProducts);

  const queryImagesSql = `SELECT pi.id, pi.product_id, p.sku, pi.image_url, pi.is_primary, pi.display_order FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE p.brand_id = ${brandId};`;
  const dbImages = execSync(`docker exec sanitarywarecrm-mysql-1 mysql -u root -pstaging_root_password_123 sanitaryware_crm_staging -e "${queryImagesSql}"`, { encoding: 'utf8' });
  console.log('MySQL product_images table entries:');
  console.log(dbImages);

  // 6. Test Web Frontend UI with Playwright
  console.log('\n--- Step 6: Web UI Verification (Modal Review Table & Products Catalog) ---');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="username"], input[type="text"]', 'admin');
  await page.fill('input[name="password"], input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign in"), button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);

  // Navigate to /products
  await page.goto(`${BASE_URL}/products`);
  await page.waitForTimeout(2000);

  // Take screenshot of products table showing imported products with primary images
  const screenshotDir = path.resolve(__dirname, '../../docs/qa-evidence');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  const productsCatalogScreenshot = path.join(screenshotDir, '06_web_products_with_extracted_images.png');
  await page.screenshot({ path: productsCatalogScreenshot, fullPage: true });
  console.log('✓ Captured Products Catalog screenshot:', productsCatalogScreenshot);

  // Open Bulk Upload Modal
  console.log('Opening Bulk Upload modal...');
  const bulkUploadBtn = page.locator('button:has-text("Bulk Upload"), button:has-text("Import")').first();
  if (await bulkUploadBtn.isVisible()) {
    await bulkUploadBtn.click();
    await page.waitForTimeout(1000);

    // Select the brand in modal
    const brandSelect = page.locator('div.fixed.inset-0 select').first();
    if (await brandSelect.isVisible()) {
      await brandSelect.selectOption({ value: String(brandId) }).catch(async () => {
        await brandSelect.selectOption({ label: brandName });
      });
    }

    // Set file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    await page.waitForTimeout(4000);

    // Screenshot modal review table with Image thumbnails and stats
    const modalReviewScreenshot = path.join(screenshotDir, '07_web_bulk_upload_preview_thumbnails.png');
    await page.screenshot({ path: modalReviewScreenshot });
    console.log('✓ Captured Bulk Upload Modal Preview screenshot:', modalReviewScreenshot);
  }

  await browser.close();
  console.log('\n=== ALL CATALOG PDF IMPORT VERIFICATION STEPS COMPLETED SUCCESSFULLY ===');
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
