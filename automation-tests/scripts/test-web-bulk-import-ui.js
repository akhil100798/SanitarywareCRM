const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  console.log('--- Starting Web UI Bulk Catalog Import & Product Verification ---');

  const ts = Date.now().toString().slice(-4);
  const skuSuffix = 'UI' + ts;

  // 1. Generate unique catalog PDF with suffix
  execSync(`python automation-tests/scripts/generate-catalog-pdf.py ${skuSuffix}`, { stdio: 'inherit' });
  const pdfPath = path.resolve('valid_sanitaryware_catalog.pdf');

  // 2. Create Brand for this UI test via API
  const loginRes = await fetch('http://localhost:8081/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();

  const brandRes = await fetch('http://localhost:8081/api/brands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: `Sanitary Brand ${ts}` })
  });
  const brand = await brandRes.json();
  console.log(`Created Brand for UI Test: ${brand.name} (ID: ${brand.id})`);

  // Ensure screenshot directory exists
  const ssDir = path.resolve('docs/qa-screenshots');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

  // 3. Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 4. Navigate & Login
    console.log('Navigating to http://localhost/login ...');
    await page.goto('http://localhost/login', { waitUntil: 'networkidle' });

    await page.fill('input[name="username"], input[type="text"]', 'admin');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for dashboard / navigation
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 5. Navigate to Products page
    console.log('Navigating to http://localhost/products ...');
    await page.goto('http://localhost/products', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 6. Click "Bulk Import" button
    console.log('Opening Bulk Import Modal ...');
    const bulkImportBtn = page.locator('button[aria-label="Bulk Import"], button:has-text("Bulk Import")');
    await bulkImportBtn.click();
    await page.waitForSelector('text=Bulk Import Catalog (PDF)', { timeout: 5000 });

    const modal = page.locator('div.fixed.inset-0');

    // 7. Select the newly created Brand inside modal
    console.log(`Selecting brand: ${brand.name} (ID: ${brand.id}) ...`);
    const brandSelect = modal.locator('select');
    await brandSelect.selectOption(String(brand.id));
    await page.waitForTimeout(500);

    // 8. Attach PDF file inside modal
    console.log(`Attaching catalog PDF: ${pdfPath} ...`);
    const fileInput = modal.locator('input[type="file"][accept=".pdf"]');
    await fileInput.setInputFiles(pdfPath);
    await page.waitForTimeout(500);

    // 9. Click "Preview Catalogue"
    console.log('Clicking Preview Catalogue ...');
    const previewBtn = modal.locator('button[type="submit"]');
    await previewBtn.click();

    // 10. Wait for Review Import Preview table to render
    await page.waitForSelector('text=Review Import Preview', { timeout: 10000 });
    await page.waitForSelector(`text=E8306${skuSuffix}`, { timeout: 5000 });
    console.log('Preview table rendered successfully with extracted SKUs, HSNs, and prices!');

    // Wait for all rows to render cleanly
    await page.waitForTimeout(1000);

    // 11. Take Screenshot 11: Web Bulk Catalog Preview
    const previewScreenshot = path.join(ssDir, '11_web_bulk_catalog_preview.png');
    await page.screenshot({ path: previewScreenshot, fullPage: false });
    console.log(`[SAVED] Screenshot: ${previewScreenshot}`);

    // 12. Confirm and Import
    console.log('Clicking Confirm and Import ...');
    const confirmBtn = modal.locator('button:has-text("Confirm and Import")');
    await confirmBtn.click();

    // 13. Wait for Import Summary screen
    await page.waitForSelector('text=Import Summary', { timeout: 10000 });
    await page.waitForSelector('text=Created', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // 14. Take Screenshot 12: Web Bulk Catalog Import Success
    const importSuccessScreenshot = path.join(ssDir, '12_web_bulk_catalog_import_success.png');
    await page.screenshot({ path: importSuccessScreenshot, fullPage: false });
    console.log(`[SAVED] Screenshot: ${importSuccessScreenshot}`);

    // Close the modal
    const closeBtn = modal.locator('button:has-text("Close"), button:has-text("Done")').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1000);

    // 15. Upload an image to one of the newly imported products and view it in the catalog
    // Find the created product ID
    const searchProdsRes = await fetch(`http://localhost:8081/api/products?page=0&size=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const prodsData = await searchProdsRes.json();
    const importedProd = (prodsData.content || prodsData).find(p => p.sku === `E8306${skuSuffix}`);

    if (importedProd) {
      console.log(`Found imported product: ${importedProd.name} (ID: ${importedProd.id}, SKU: ${importedProd.sku})`);
      // Upload sample image via backend
      const sampleImgBytes = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const imgForm = new FormData();
      imgForm.append('file', new Blob([sampleImgBytes], { type: 'image/png' }), 'seat_cover.png');
      imgForm.append('isPrimary', 'true');

      const imgRes = await fetch(`http://localhost:8081/api/products/${importedProd.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: imgForm
      });
      console.log('Product image upload HTTP status:', imgRes.status);

      // Refresh /products page and filter/search to display the product with its thumbnail, SKU, and HSN
      await page.goto('http://localhost/products', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      // Search for the product SKU
      const searchBox = page.locator('input[placeholder*="Search by SKU"], input[placeholder*="Search"]').first();
      if (await searchBox.count() > 0) {
        await searchBox.fill(`E8306${skuSuffix}`);
        await page.waitForTimeout(1500);
      }

      const productImgScreenshot = path.join(ssDir, '13_web_product_catalog_with_image.png');
      await page.screenshot({ path: productImgScreenshot, fullPage: false });
      console.log(`[SAVED] Screenshot: ${productImgScreenshot}`);
    }

    console.log('\n--- Web UI Bulk Import & Catalog Verification Finished Successfully! ---');
  } catch (err) {
    console.error('Error during Web UI test:', err);
    await page.screenshot({ path: path.join(ssDir, 'error_ui_bulk_import.png') });
    throw err;
  } finally {
    await browser.close();
  }
})();
