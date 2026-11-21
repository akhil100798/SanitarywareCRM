const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function run() {
    console.log('=== STARTING BOQ IMPORTER E2E VERIFICATION ===');
    
    // 1. Create a sample BOQ CSV file
    const boqCsvContent = `Item Code,Description,Quantity,Budget Rate
L0664AVTRU,Veso Johnson Bathrooms Wall Hung WC Vigo,2,14290
L0607LRUF,Verona Lucca Avante Basin,4,14940
UNKNOWN-SHOWER-88,Wall Hung Ceramic Basin White,5,4500
`;
    const tempCsvPath = path.join(__dirname, 'sample-contractor-boq.csv');
    fs.writeFileSync(tempCsvPath, boqCsvContent, 'utf-8');
    console.log('Created sample contractor BOQ CSV:', tempCsvPath);

    // 2. Direct API test against backend using native fetch
    console.log('Testing backend POST /api/quotations/import-boq via native fetch...');
    const loginRes = await fetch('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Admin login successful, token received.');

    const formData = new FormData();
    const fileBytes = fs.readFileSync(tempCsvPath);
    formData.append('file', new Blob([fileBytes], { type: 'text/csv' }), 'sample-contractor-boq.csv');

    const boqRes = await fetch('http://localhost:8081/api/quotations/import-boq', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    const boqData = await boqRes.json();
    console.log('API Response Status:', boqRes.status);
    console.log('API Total Rows:', boqData.totalRows);
    console.log('API Matched Count:', boqData.matchedCount);
    console.log('API Candidate Count:', boqData.candidateCount);
    console.log('API Unmatched Count:', boqData.unmatchedCount);
    console.log('API Items summary:', boqData.items?.map(i => ({
        requestedCode: i.requestedProductCode,
        status: i.matchStatus,
        matchedSku: i.matchedProductSku,
        qty: i.requestedQuantity,
        candidatesCount: i.candidateOptions?.length
    })));

    if (!boqData.totalRows || boqData.totalRows < 3) {
        throw new Error('Expected at least 3 parsed rows from BOQ');
    }

    // 3. Browser UI Verification with Playwright
    console.log('Launching Chromium for Web UI verification...');
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

    // Verify "Import BOQ / Excel" button is visible
    const importBoqBtn = await page.waitForSelector('text=Import BOQ / Excel');
    console.log('Found "Import BOQ / Excel" button on Quotations List.');

    // Click Import BOQ / Excel
    await importBoqBtn.click();
    await page.waitForURL('**/quotations/new?importBoq=true');
    console.log('Navigated to Quotation Form with importBoq=true query parameter.');

    // Verify Modal is open
    await page.waitForSelector('text=Import Quotation Items from Customer BOQ');
    console.log('BoqImportModal is open!');

    // Upload the sample CSV
    console.log('Uploading sample contractor BOQ CSV...');
    const fileInput = await page.waitForSelector('input[type="file"]');
    await fileInput.setInputFiles(tempCsvPath);

    // Click "Analyze Requirement Sheet"
    console.log('Clicking "Analyze Requirement Sheet"...');
    await page.click('button:has-text("Analyze Requirement Sheet")');

    // Wait for parse results
    await page.waitForSelector('text=Exact Matches', { timeout: 20000 });
    console.log('Parsing results rendered successfully!');
    await page.waitForTimeout(1000);

    // Capture screenshot of the modal with matching results
    const reportsDir = path.join(__dirname, '..', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const modalScreenshotPath = path.join(reportsDir, 'boq-import-modal-verified.png');
    await page.screenshot({ path: modalScreenshotPath, fullPage: true });
    console.log('Saved modal screenshot to:', modalScreenshotPath);

    // Also copy to brain artifact dir
    const brainDir = 'C:\\Users\\akhil\\.gemini\\antigravity\\brain\\3d7fdc32-253a-48db-81f7-6eb95f026067';
    fs.mkdirSync(brainDir, { recursive: true });
    fs.copyFileSync(modalScreenshotPath, path.join(brainDir, 'boq-import-modal-live.png'));

    // Click "Populate Quotation"
    console.log('Clicking "Populate Quotation"...');
    await page.click('button:has-text("Populate Quotation")');

    // Wait for modal to close and quotation form line items to reflect
    await page.waitForTimeout(2000);
    console.log('Verifying populated line items in Quotation form...');
    await page.waitForSelector('text=Estimate Items Line');

    // Capture screenshot of the populated Quotation form
    const formScreenshotPath = path.join(reportsDir, 'quotation-form-boq-populated.png');
    await page.screenshot({ path: formScreenshotPath, fullPage: true });
    console.log('Saved form screenshot to:', formScreenshotPath);
    fs.copyFileSync(formScreenshotPath, path.join(brainDir, 'quotation-form-boq-live.png'));

    await browser.close();
    console.log('=== BOQ IMPORTER E2E VERIFICATION COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
});
