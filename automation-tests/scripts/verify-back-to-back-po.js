const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function run() {
    console.log('=== STARTING BACK-TO-BACK PURCHASE ORDER E2E VERIFICATION ===');

    // 1. Authenticate with backend API
    console.log('Logging in to backend API via native fetch...');
    const loginRes = await fetch('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Admin login successful, token obtained.');

    // 2. Fetch existing quotations to target
    const quotesRes = await fetch('http://localhost:8081/api/quotations?size=20', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const quotesData = await quotesRes.json();
    let targetQuotation = quotesData.content?.find(q => q.items && q.items.length > 0) || quotesData.content?.[0];

    // If no quotations or quotation has no items, create one with products
    if (!targetQuotation || !targetQuotation.items || targetQuotation.items.length === 0) {
        console.log('Creating a sample quotation for Back-to-Back testing...');
        const custRes = await fetch('http://localhost:8081/api/customers', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const custData = await custRes.json();
        const customerId = custData.content?.[0]?.id || 1;

        const prodRes = await fetch('http://localhost:8081/api/products?size=5', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const prodData = await prodRes.json();
        const prods = prodData.content || [];

        const newQuotePayload = {
            customerId: customerId,
            quotationDate: new Date().toISOString().split('T')[0],
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'ACCEPTED',
            taxPercentage: 18,
            discount: 0,
            items: prods.slice(0, 2).map(p => ({
                productId: p.id,
                quantity: 10,
                unitPrice: p.sellingPrice || 12000,
                discountPercentage: 0,
                lineTotal: (p.sellingPrice || 12000) * 10,
                gstRate: 18,
                hsnCode: p.hsnCode || '6910',
                barcode: p.barcode || ''
            }))
        };

        const createQuoteRes = await fetch('http://localhost:8081/api/quotations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(newQuotePayload)
        });
        targetQuotation = await createQuoteRes.json();
        console.log('Created test quotation:', targetQuotation.quotationNumber, 'ID:', targetQuotation.id);
    } else {
        console.log('Using target quotation:', targetQuotation.quotationNumber, 'ID:', targetQuotation.id);
    }

    // 3. Test Preview API
    console.log(`Testing GET /api/quotations/${targetQuotation.id}/back-to-back-preview...`);
    const previewRes = await fetch(`http://localhost:8081/api/quotations/${targetQuotation.id}/back-to-back-preview`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Preview Response Status:', previewRes.status);
    const previewData = await previewRes.json();
    console.log('Preview Details:');
    console.log(`  Quotation: ${previewData.quotationNumber} (Status: ${previewData.quotationStatus})`);
    console.log(`  Total Items: ${previewData.totalLineItems} | Deficit Items: ${previewData.totalDeficitItems}`);
    console.log(`  Supplier Groups Count: ${previewData.supplierGroups?.length}`);
    previewData.supplierGroups?.forEach(g => {
        console.log(`    - Group Brand: ${g.brandName} | Suggested Distributor: ${g.suggestedDistributorName} | Items: ${g.items?.length}`);
    });

    if (previewRes.status !== 200 || !previewData.supplierGroups) {
        throw new Error('Back-to-back preview API verification failed');
    }

    // 4. Browser UI Verification with Playwright
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
    await page.waitForTimeout(1000);

    // Find the Back-to-Back PO button (Truck icon) on the target quotation row
    console.log('Locating Back-to-Back PO action button...');
    const b2bBtn = await page.waitForSelector('button[title="Generate Back-to-Back Purchase Orders"]');
    await b2bBtn.click();

    // Verify Modal opens
    await page.waitForSelector('text=Generate Back-to-Back Purchase Orders');
    console.log('GenerateBackToBackPoModal is open!');
    await page.waitForTimeout(1500);

    // Save screenshot of modal configuration
    const reportsDir = path.join(__dirname, '..', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const brainDir = 'C:\\Users\\akhil\\.gemini\\antigravity\\brain\\3d7fdc32-253a-48db-81f7-6eb95f026067';
    fs.mkdirSync(brainDir, { recursive: true });

    const modalScreenshotPath = path.join(reportsDir, 'back-to-back-po-modal-verified.png');
    await page.screenshot({ path: modalScreenshotPath, fullPage: true });
    console.log('Saved modal screenshot to:', modalScreenshotPath);
    fs.copyFileSync(modalScreenshotPath, path.join(brainDir, 'back-to-back-po-modal-live.png'));

    // Click "Generate Purchase Orders" button
    console.log('Clicking "Generate Purchase Orders"...');
    await page.click('button:has-text("Generate Purchase Orders")');

    // Wait for success screen
    await page.waitForSelector('text=Purchase Orders Created Successfully!', { timeout: 20000 });
    console.log('Purchase Orders created successfully view rendered!');
    await page.waitForTimeout(1000);

    // Save screenshot of success screen
    const successScreenshotPath = path.join(reportsDir, 'back-to-back-po-success-verified.png');
    await page.screenshot({ path: successScreenshotPath, fullPage: true });
    console.log('Saved success screenshot to:', successScreenshotPath);
    fs.copyFileSync(successScreenshotPath, path.join(brainDir, 'back-to-back-po-success-live.png'));

    await browser.close();
    console.log('=== BACK-TO-BACK PURCHASE ORDER E2E VERIFICATION COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
});
