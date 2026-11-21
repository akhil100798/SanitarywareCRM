const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function run() {
    console.log('=== STARTING CONTRACTOR ESTIMATE PHOTO OCR VERIFICATION ===');
    
    const noteImagePath = path.join(__dirname, 'contractor-estimate-note.png');
    if (!fs.existsSync(noteImagePath)) {
        throw new Error('Contractor note image does not exist: ' + noteImagePath);
    }
    console.log('Using contractor estimate image:', noteImagePath);

    // 1. Direct API test against backend using native fetch
    console.log('Testing backend POST /api/quotations/import-boq with image via native fetch...');
    const loginRes = await fetch('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Admin login successful, token received.');

    const formData = new FormData();
    const fileBytes = fs.readFileSync(noteImagePath);
    formData.append('file', new Blob([fileBytes], { type: 'image/png' }), 'contractor-estimate-note.png');

    const boqRes = await fetch('http://localhost:8081/api/quotations/import-boq', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    const boqData = await boqRes.json();
    console.log('API Response Status:', boqRes.status);
    console.log('API Total Rows Parsed via OCR:', boqData.totalRows);
    console.log('API Matched Count:', boqData.matchedCount);
    console.log('API Fuzzy Count:', boqData.fuzzyCount);
    console.log('API Unmatched Count:', boqData.unmatchedCount);
    console.log('API Items Summary:');
    boqData.items?.forEach((item, i) => {
        console.log(`  [Row ${i + 1}] Status: ${item.matchStatus} | Detected SKU: ${item.requestedSku} | Matched: ${item.matchedProductSku} (${item.matchedProductName}) | Qty: ${item.requestedQuantity} | Unit Price: Rs ${item.unitPrice}`);
    });

    if (!boqData.totalRows || boqData.totalRows < 2) {
        throw new Error('Expected at least 2 items parsed from OCR photo');
    }

    // 2. Browser UI Verification with Playwright
    console.log('Launching Chromium for Web UI OCR photo import verification...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    // Login
    console.log('Navigating to login page...');
    await page.goto('http://localhost/login');
    await page.waitForSelector('input[name="username"]');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Successfully logged in.');

    // Navigate to Quotations List
    console.log('Navigating to /quotations...');
    await page.goto('http://localhost/quotations');
    await page.waitForSelector('text=Sales Quotations');

    // Click Import BOQ / Excel
    const importBoqBtn = await page.waitForSelector('text=Import BOQ / Excel');
    await importBoqBtn.click();
    await page.waitForURL('**/quotations/new?importBoq=true');
    console.log('Navigated to Quotation Form with modal open.');

    // Verify Modal is open
    await page.waitForSelector('text=Import Quotation Items from Customer BOQ');
    console.log('BoqImportModal is open!');

    // Upload the contractor photo
    console.log('Uploading contractor estimate photo...');
    const fileInput = await page.waitForSelector('input[type="file"]');
    await fileInput.setInputFiles(noteImagePath);

    // Click "Analyze Requirement Sheet"
    console.log('Clicking "Analyze Requirement Sheet"...');
    await page.click('button:has-text("Analyze Requirement Sheet")');

    // Wait for parse results
    await page.waitForSelector('text=Exact Matches', { timeout: 25000 });
    console.log('OCR Parsing results rendered successfully!');
    await page.waitForTimeout(1000);

    // Capture screenshot of the modal with OCR matching results
    const reportsDir = path.join(__dirname, '..', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const modalScreenshotPath = path.join(reportsDir, 'ocr-import-modal-verified.png');
    await page.screenshot({ path: modalScreenshotPath, fullPage: true });
    console.log('Saved modal screenshot to:', modalScreenshotPath);

    const brainDir = 'C:\\Users\\akhil\\.gemini\\antigravity\\brain\\3d7fdc32-253a-48db-81f7-6eb95f026067';
    fs.mkdirSync(brainDir, { recursive: true });
    fs.copyFileSync(modalScreenshotPath, path.join(brainDir, 'ocr-import-modal-live.png'));

    // Click "Populate Quotation"
    console.log('Clicking "Populate Quotation"...');
    await page.click('button:has-text("Populate Quotation")');

    // Wait for modal to close and quotation form line items to reflect
    await page.waitForTimeout(2000);
    console.log('Verifying populated line items in Quotation form...');
    await page.waitForSelector('text=Estimate Items Line');

    // Capture screenshot of the populated Quotation form
    const formScreenshotPath = path.join(reportsDir, 'ocr-quotation-form-populated.png');
    await page.screenshot({ path: formScreenshotPath, fullPage: true });
    console.log('Saved form screenshot to:', formScreenshotPath);
    fs.copyFileSync(formScreenshotPath, path.join(brainDir, 'ocr-quotation-form-live.png'));

    await browser.close();
    console.log('=== CONTRACTOR ESTIMATE PHOTO OCR VERIFICATION COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
    console.error('OCR VERIFICATION ERROR:', err);
    process.exit(1);
});
