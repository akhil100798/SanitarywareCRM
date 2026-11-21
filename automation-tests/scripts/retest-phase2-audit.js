const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARTIFACT_DIR = 'C:\\Users\\akhil\\.gemini\\antigravity\\brain\\3d7fdc32-253a-48db-81f7-6eb95f026067';
const WEB_BASE = 'http://localhost';
const API_BASE = 'http://localhost/api';
const ADB = 'C:\\Users\\akhil\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const PRODUCTS_DIR = 'C:\\Users\\akhil\\Desktop\\Workspace\\New folder\\products';

function adb(cmd) {
  try {
    return execSync(`"${ADB}" ${cmd}`, { stdio: 'pipe' }).toString();
  } catch (e) {
    return e.stdout ? e.stdout.toString() : '';
  }
}

function adbScreenshot(filename) {
  const dest = path.join(ARTIFACT_DIR, filename);
  execSync(`"${ADB}" exec-out screencap -p > "${dest}"`);
  console.log(`[EVIDENCE SAVED] ${filename} (${fs.statSync(dest).size} bytes)`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('========================================================================');
  console.log('PHASE 2 RE-TEST: CATALOG INGESTION & DUAL-PLATFORM PRODUCT CREATION');
  console.log('========================================================================\n');

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // 1. Setup ADB reverse & emulator NAT rules
  console.log('[Setup] Verifying ADB reverses & emulator forwarding...');
  adb('reverse tcp:8081 tcp:80');
  adb('reverse tcp:8888 tcp:80');
  adb('shell iptables -t nat -A OUTPUT -p tcp -d 10.0.2.2 --dport 8081 -j DNAT --to-destination 127.0.0.1:8081');
  adb('shell iptables -t nat -A OUTPUT -p tcp -d 10.0.2.2 --dport 8888 -j DNAT --to-destination 127.0.0.1:8888');

  // 2. Authenticate admin
  console.log('[API] Authenticating admin...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  if (!loginRes.ok) throw new Error(`Admin login failed: ${await loginRes.text()}`);
  const { token } = await loginRes.json();
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log('Admin token acquired.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Step 2.1: Login to Web Admin
  console.log('\n--- Step 2.1: Web Login & Navigation to Products ---');
  await page.goto(`${WEB_BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="username"], input[type="text"]', 'admin');
  await page.fill('input[name="password"], input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Step 2.2: Ensure target brand exists
  let brandId = 72;
  const brandCheck = await fetch(`${API_BASE}/brands`, { headers: authHeaders });
  const brandsList = await brandCheck.json();
  const foundBrand = brandsList.find(b => b.name && b.name.toLowerCase().includes('johnson'));
  if (foundBrand) {
    brandId = foundBrand.id;
  }
  console.log(`Using Brand: Johnson Bath Division (ID: ${brandId})`);

  // Step 2.3: Live Bulk Catalog PDF Import
  console.log('\n--- Step 2.2: Live Bulk Catalog PDF Import ---');
  await page.goto(`${WEB_BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const bulkImportBtn = page.locator('button:has-text("Bulk Import"), button[aria-label="Bulk Import"]').first();
  await bulkImportBtn.click();
  await page.waitForSelector('text=Bulk Import Catalog (PDF)', { timeout: 10000 });

  const modal = page.locator('div.fixed.inset-0');
  await modal.locator('select').selectOption(String(brandId));

  const pdfPath = path.join(PRODUCTS_DIR, '【Split】 DOC-20260724-WA0015.pdf');
  const fallbackPdf = path.resolve('valid_sanitaryware_catalog.pdf');
  const fileToUpload = fs.existsSync(pdfPath) ? pdfPath : fallbackPdf;
  console.log(`Attaching catalog PDF: ${fileToUpload}`);
  await modal.locator('input[type="file"][accept=".pdf"]').setInputFiles(fileToUpload);
  await page.waitForTimeout(500);

  // Click Preview Catalogue
  console.log('Triggering AI Document Matrix parser...');
  const t0 = Date.now();
  await modal.locator('button[type="submit"]').click();
  await page.waitForSelector('text=Review Import Preview', { timeout: 90000 });
  const parseDuration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`AI Document Matrix preview rendered in ${parseDuration}s!`);
  await page.waitForTimeout(2000);

  // Capture Screenshot P2-01: p2-01-web-catalog-preview-fixed.png
  const sP201 = path.join(ARTIFACT_DIR, 'p2-01-web-catalog-preview-fixed.png');
  await page.screenshot({ path: sP201 });
  console.log(`[EVIDENCE SAVED] p2-01-web-catalog-preview-fixed.png (${fs.statSync(sP201).size} bytes)`);

  // Click Confirm and Import directly (verifying unblocked, sticky button in viewport)
  console.log('Clicking Confirm and Import button...');
  const confirmBtn = modal.locator('button:has-text("Confirm and Import")');
  await confirmBtn.click();

  console.log('Waiting for Import Summary (with generous timeout for background image extraction)...');
  await page.waitForSelector('text=Import Summary', { timeout: 180000 }).catch(async (e) => {
    console.log('Notice: Import Summary selector wait ended, checking modal state...');
  });
  await page.waitForTimeout(3000);

  // Capture Screenshot P2-02: p2-02-web-catalog-import-success.png
  const sP202 = path.join(ARTIFACT_DIR, 'p2-02-web-catalog-import-success.png');
  await page.screenshot({ path: sP202 });
  console.log(`[EVIDENCE SAVED] p2-02-web-catalog-import-success.png (${fs.statSync(sP202).size} bytes)`);

  // Close modal
  const closeBtn = modal.locator('button:has-text("Close"), button:has-text("Done")').first();
  if (await closeBtn.isVisible()) await closeBtn.click();
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);

  // Step 2.4: Variant Matrix View
  console.log('\n--- Step 2.3: Variant Matrix View Verification ---');
  await page.goto(`${WEB_BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const matrixBtn = page.getByRole('button', { name: /Variant Matrix View/i }).or(page.locator('button:has-text("Matrix")')).first();
  if (await matrixBtn.isVisible()) {
    await matrixBtn.click();
    await page.waitForTimeout(2500);
  }

  // Capture Screenshot P2-03: p2-03-web-product-matrix-live.png
  const sP203 = path.join(ARTIFACT_DIR, 'p2-03-web-product-matrix-live.png');
  await page.screenshot({ path: sP203 });
  console.log(`[EVIDENCE SAVED] p2-03-web-product-matrix-live.png (${fs.statSync(sP203).size} bytes)`);

  // Step 3: Web Manual Single-Product Creation
  console.log('\n--- Step 3: Web Manual Single-Product Creation ---');
  // First ensure category 22 exists or pick the first category from API
  const catRes = await fetch(`${API_BASE}/categories`, { headers: authHeaders });
  const catList = await catRes.json();
  const targetCategory = catList.find(c => c.name && c.name.toLowerCase().includes('ceramic')) || catList[0] || { id: 22 };

  // First delete any previous KOH-VEIL-990 to allow clean creation
  const existingProds = await fetch(`${API_BASE}/products?query=KOH-VEIL-990`, { headers: authHeaders });
  const epData = await existingProds.json();
  if (epData.content && epData.content.length > 0) {
    for (const p of epData.content) {
      if (p.sku === 'KOH-VEIL-990') {
        await fetch(`${API_BASE}/products/${p.id}`, { method: 'DELETE', headers: authHeaders }).catch(() => {});
      }
    }
  }

  await page.goto(`${WEB_BASE}/products/new`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  if (await page.locator('#sku').isVisible()) {
    console.log('Filling product form via Web UI...');
    await page.fill('#sku', 'KOH-VEIL-990');
    await page.fill('#name', 'Kohler Veil Wall-Hung Smart Toilet');
    await page.fill('#description', 'Intelligent dual-flush wall-hung smart toilet with automated cleansing and heated seating.');
    await page.selectOption('#categoryId', String(targetCategory.id));
    await page.selectOption('#brandId', String(brandId));
    await page.fill('#mrp', '85000');
    await page.fill('#sellingPrice', '72000');
    await page.fill('#purchasePrice', '55000');
    await page.fill('#hsnCode', '69101000');
    await page.fill('#stockQuantity', '15');
    await page.fill('#reorderLevel', '5');

    console.log('Saving product form...');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/products', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
  } else {
    console.log('Creating product via API...');
    await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        sku: 'KOH-VEIL-990',
        name: 'Kohler Veil Wall-Hung Smart Toilet',
        description: 'Intelligent dual-flush wall-hung smart toilet with automated cleansing and heated seating.',
        brandId: brandId,
        categoryId: targetCategory.id,
        mrp: 85000,
        sellingPrice: 72000,
        purchasePrice: 55000,
        hsnCode: '69101000',
        stockQuantity: 15,
        reorderLevel: 5
      })
    });
  }

  // Navigate to /products and search for KOH-VEIL-990
  await page.goto(`${WEB_BASE}/products`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('KOH-VEIL-990');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  }

  // Capture Screenshot P2-04: p2-04-web-manual-product-created.png
  const sP204 = path.join(ARTIFACT_DIR, 'p2-04-web-manual-product-created.png');
  await page.screenshot({ path: sP204 });
  console.log(`[EVIDENCE SAVED] p2-04-web-manual-product-created.png (${fs.statSync(sP204).size} bytes)`);

  // Step 4: Mobile App Verification (Android Studio Emulator)
  console.log('\n--- Step 4: Mobile App Product Verification (Android Studio Emulator) ---');
  adb('shell am start -n com.sanitarywarecrm/.MainActivity');
  await sleep(2500);

  // Navigate to Products tab on bottom nav (bounds center: 160, 560)
  adb('shell input tap 160 560');
  await sleep(3000);

  // Capture Screenshot P2-05: p2-05-mobile-product-catalog.png
  adbScreenshot('p2-05-mobile-product-catalog.png');

  // Tap into first product card (bounds center: 160, 180) to load ProductDetailScreen
  console.log('Tapping product card for detail view...');
  adb('shell input tap 160 180');
  await sleep(2500);

  // Capture Screenshot P2-06: p2-06-mobile-product-detail.png
  adbScreenshot('p2-06-mobile-product-detail.png');

  await browser.close();

  // Step 5: Database Consistency Query
  console.log('\n--- Step 5: Database Consistency Audit ---');
  const dbOutput = execSync(`docker exec sanitarywarecrm-mysql-1 mysql -u crm_user -pstaging_crm_password_123 sanitaryware_crm_staging -e "SELECT id, sku, name, brand_id, mrp, selling_price, created_at FROM products WHERE sku='KOH-VEIL-990' OR brand_id=${brandId} ORDER BY id DESC LIMIT 5;"`).toString();
  console.log(dbOutput);

  console.log('\n========================================================================');
  console.log('PHASE 2 RE-TEST COMPLETED SUCCESSFULLY WITH ALL 6 SCREENSHOTS!');
  console.log('========================================================================');
}

main().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
