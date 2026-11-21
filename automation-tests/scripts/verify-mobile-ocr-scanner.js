const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const DIST_DIR = path.resolve(__dirname, '../../mobile/dist-web');
const PORT = 8086;
const APP_URL = `http://localhost:${PORT}`;
const API_URL = 'http://localhost:8081/api';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function startStaticServer() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api')) {
      const proxyHeaders = { ...req.headers, host: 'localhost:8081' };
      if (proxyHeaders.origin) {
        proxyHeaders.origin = 'http://localhost:8081';
      }
      const proxyReq = http.request(
        {
          host: 'localhost',
          port: 8081,
          path: req.url,
          method: req.method,
          headers: proxyHeaders
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );
      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
      req.pipe(proxyReq);
      return;
    }

    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || !path.extname(reqPath)) {
      reqPath = '/index.html';
    }
    const filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath)) {
      const fallback = path.join(DIST_DIR, 'index.html');
      const content = fs.readFileSync(fallback);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Mobile Web static server listening on ${APP_URL}`);
      resolve(server);
    });
  });
}

async function run() {
  console.log('=== STARTING MOBILE APP CONTRACTOR NOTE OCR SCANNER VERIFICATION ===');
  const server = await startStaticServer();

  const reportsDir = path.resolve(__dirname, '../reports');
  const brainDir = 'C:\\Users\\akhil\\.gemini\\antigravity\\brain\\3d7fdc32-253a-48db-81f7-6eb95f026067';
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const pixel5 = devices['Pixel 5'];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...pixel5,
    locale: 'en-US'
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('Content Security Policy')) {
      console.log('PAGE LOG:', text.slice(0, 120));
    }
  });

  try {
    console.log(`Navigating to mobile app at ${APP_URL}...`);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for login or main screen
    console.log('Checking authentication state on mobile...');
    await page.waitForTimeout(2000);

    const isLoginVisible = await page.isVisible('input');
    if (isLoginVisible) {
      console.log('Entering login credentials...');
      await page.getByPlaceholder('admin').fill('admin');
      await page.getByPlaceholder('Password').fill('admin123');
      console.log('Clicking Sign In...');
      await page.getByText('Sign In', { exact: true }).first().click();
      await page.waitForTimeout(3000);
      console.log('Authentication submitted successfully.');
    }

    console.log('Navigating to Customers list in mobile bottom tabs...');
    const customersTab = page.locator('text=Customers').first();
    await customersTab.waitFor({ state: 'visible', timeout: 10000 });
    await customersTab.click();
    await page.waitForTimeout(2000);

    // Wait for customer list to load
    console.log('Waiting for customers to load...');
    await page.waitForSelector('text=records', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Find first clickable customer item
    console.log('Selecting first customer card...');
    const firstCustomer = page.locator('div[role="button"], [tabindex="0"]').filter({ hasText: /Phone|Email|@|\+91|[0-9]{3}/i }).first();
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();
    } else {
      // Fallback: click any customer name
      const anyCard = page.locator('div[role="button"]').nth(1);
      await anyCard.click();
    }
    await page.waitForTimeout(2000);

    // Look for "Create Quotation" in CustomerDetailScreen
    console.log('Looking for Create Quotation action...');
    const createQuoteBtn = page.locator('text=Create Quotation').first();
    await createQuoteBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createQuoteBtn.click();
    await page.waitForTimeout(2000);

    // Verify QuotationFormScreen is visible
    console.log('Checking for QuotationFormScreen and Scan Note button...');
    await page.waitForSelector('text=New Quotation', { timeout: 10000 });

    const scanNoteBtn = page.locator('text=Scan Note (OCR)').first();
    await scanNoteBtn.waitFor({ state: 'visible', timeout: 8000 });
    console.log('SUCCESS: "Scan Note (OCR)" button found in mobile quotation screen!');

    // Click "Scan Note (OCR)"
    console.log('Opening Contractor Note Scanner Modal...');
    await scanNoteBtn.click();
    await page.waitForTimeout(1000);

    // Verify modal is open
    await page.waitForSelector('text=Scan Contractor Note', { timeout: 8000 });
    console.log('SUCCESS: ContractorNoteScannerModal opened!');

    // Capture modal screenshot
    const modalShotPath = path.join(reportsDir, 'mobile-ocr-scanner-modal-verified.png');
    await page.screenshot({ path: modalShotPath });
    console.log(`Saved mobile scanner modal screenshot to ${modalShotPath}`);
    if (fs.existsSync(brainDir)) {
      fs.copyFileSync(modalShotPath, path.join(brainDir, 'mobile-ocr-modal-live.png'));
    }

    // Trigger OCR with sample contractor note
    console.log('Clicking "Load Test Contractor Note" to trigger OCR engine...');
    const sampleBtn = page.getByText('Load Test Contractor Note', { exact: true }).first();
    await sampleBtn.waitFor({ state: 'visible', timeout: 5000 });
    await sampleBtn.click();
    if (await sampleBtn.isVisible()) {
      console.log('Clicking "Load Test Contractor Note"...');
      await sampleBtn.click();
    }

    // Wait for OCR items to render
    console.log('Waiting for OCR recognition and product matching...');
    await page.waitForSelector('text=/Extracted Line Items|Exact Match|Suggestion/i', { timeout: 20000 });
    console.log('SUCCESS: OCR extracted items displayed in mobile scanner modal!');
    await page.waitForTimeout(1500);

    // Click "Import Items into Quotation"
    console.log('Applying extracted items to mobile quotation...');
    const importBtn = page.locator('text=/Import.*into Quotation/i').first();
    await importBtn.click();
    await page.waitForTimeout(1500);

    // Verify items are now present in QuotationFormScreen
    console.log('Verifying populated items in mobile quotation form...');
    await page.waitForSelector('text=/Line Total|Qty/i', { timeout: 8000 });

    // Capture populated form screenshot
    const quoteShotPath = path.join(reportsDir, 'mobile-quotation-form-populated-verified.png');
    await page.screenshot({ path: quoteShotPath });
    console.log(`Saved mobile populated quotation screenshot to ${quoteShotPath}`);
    if (fs.existsSync(brainDir)) {
      fs.copyFileSync(quoteShotPath, path.join(brainDir, 'mobile-ocr-quote-live.png'));
    }

    console.log('=== MOBILE APP CONTRACTOR NOTE OCR SCANNER VERIFIED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Verification failed:', err);
    try {
      await page.screenshot({ path: path.join(reportsDir, 'mobile-error-state.png') });
      console.log('Saved debug screenshot to reports/mobile-error-state.png');
    } catch (_) {}
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

run();
