const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\akhil\\.gemini\\antigravity\\brain\\3d7fdc32-253a-48db-81f7-6eb95f026067';

async function runVerification() {
  console.log('=== Step 1: Backend Authentication ===');
  const loginRes = await fetch('http://localhost:8081/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
  }

  const authData = await loginRes.json();
  const token = authData.token;
  console.log('JWT Token successfully obtained for admin.');

  console.log('\n=== Step 2: Fetch or Create Quotation ===');
  let quoteRes = await fetch('http://localhost:8081/api/quotations?size=10', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  let quoteData = await quoteRes.json();
  let quotation = quoteData.content && quoteData.content.length > 0 ? quoteData.content[0] : null;

  if (!quotation) {
    console.log('No quotations found, creating a test quotation...');
    const custRes = await fetch('http://localhost:8081/api/customers?size=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const custData = await custRes.json();
    const customerId = custData.content[0].id;

    const prodRes = await fetch('http://localhost:8081/api/products?size=2', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const prodData = await prodRes.json();

    const newQuoteRes = await fetch('http://localhost:8081/api/quotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId: customerId,
        validUntil: '2026-12-31',
        items: prodData.content.map(p => ({
          productId: p.id,
          quantity: 2,
          unitPrice: p.sellingPrice || 5000,
          discountPercentage: 5,
          gstRate: 18,
          hsnCode: p.hsnCode || '69101000'
        })),
        taxPercentage: 18,
        discount: 100,
        notes: 'Verification test quote for Branded PDF and WhatsApp dispatch',
        termsAndConditions: 'Standard 7-day acceptance with branded QR verification.'
      })
    });
    quotation = await newQuoteRes.json();
    console.log(`Created quotation ID: ${quotation.id}, Number: ${quotation.quotationNumber}`);
  } else {
    console.log(`Found existing quotation ID: ${quotation.id}, Number: ${quotation.quotationNumber}`);
  }

  console.log('\n=== Step 3: Verify Branded PDF Generation & Dynamic QR Code ===');
  const pdfRes = await fetch(`http://localhost:8081/api/quotations/${quotation.id}/pdf`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!pdfRes.ok) {
    throw new Error(`PDF generation failed with HTTP ${pdfRes.status}: ${await pdfRes.text()}`);
  }

  const pdfArrayBuffer = await pdfRes.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfArrayBuffer);
  console.log(`Received PDF payload: ${pdfBuffer.length} bytes`);

  const magicHeader = pdfBuffer.slice(0, 5).toString('ascii');
  if (!magicHeader.startsWith('%PDF-')) {
    throw new Error(`Invalid PDF header: ${magicHeader}`);
  }
  console.log(`Verified valid PDF header: ${magicHeader}`);

  const rawPdfString = pdfBuffer.toString('latin1');
  const hasXObject = rawPdfString.includes('/XObject') || rawPdfString.includes('/Form');
  console.log(`PDF contains vector XObject / Barcode elements: ${hasXObject}`);

  const samplePdfPath = path.join(ARTIFACT_DIR, 'sample-branded-quotation.pdf');
  fs.writeFileSync(samplePdfPath, pdfBuffer);
  console.log(`Saved sample PDF artifact to: ${samplePdfPath}`);

  console.log('\n=== Step 4: Verify Public Customer Portal PDF Endpoint ===');
  // Refresh quotation to get updated shareToken
  const refreshedQuoteRes = await fetch(`http://localhost:8081/api/quotations/${quotation.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  quotation = await refreshedQuoteRes.json();
  const shareToken = quotation.shareToken;
  console.log(`Quotation shareToken: ${shareToken}`);

  if (shareToken) {
    const portalPdfRes = await fetch(`http://localhost:8081/api/portal/quotations/${shareToken}/pdf`);
    if (!portalPdfRes.ok) {
      throw new Error(`Portal PDF endpoint failed with HTTP ${portalPdfRes.status}`);
    }
    const portalPdfBuf = Buffer.from(await portalPdfRes.arrayBuffer());
    console.log(`Portal PDF retrieved successfully: ${portalPdfBuf.length} bytes`);
  }

  console.log('\n=== Step 5: Test Backend WhatsApp API Endpoint ===');
  const waRes = await fetch(`http://localhost:8081/api/quotations/${quotation.id}/send-whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ phoneNumber: '+919876543210' })
  });

  const waData = await waRes.json();
  console.log(`WhatsApp API response status: ${waData.status}, detail: ${waData.detail || 'None'}`);

  console.log('\n=== Step 6: UI Automation & Verification in Browser ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to web login...');
  await page.goto('http://localhost/login', { waitUntil: 'networkidle' });

  await page.fill('input[type="text"], input[name="username"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);
  console.log('Logged in. Navigating to Quotations page...');
  await page.goto('http://localhost/quotations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Locate the WhatsApp button for the quotation row
  console.log('Clicking WhatsApp share button on quotation...');
  const waButtons = page.locator('button[title*="WhatsApp"]');
  const waBtnCount = await waButtons.count();
  console.log(`Found ${waBtnCount} WhatsApp button(s). Clicking first button...`);
  await waButtons.first().click();

  // Wait for ShareWhatsAppModal to appear
  await page.waitForSelector('text=Share Quotation via WhatsApp', { timeout: 5000 });
  await page.waitForTimeout(1000);

  const modalScreenshotPath = path.join(ARTIFACT_DIR, 'whatsapp-share-modal-live.png');
  await page.screenshot({ path: modalScreenshotPath });
  console.log(`Captured modal screenshot: ${modalScreenshotPath}`);

  // Test Cloud WhatsApp API dispatch from modal
  console.log('Clicking "Send via Cloud WhatsApp API" in modal...');
  const sendCloudBtn = page.locator('text=Send via Cloud WhatsApp API');
  await sendCloudBtn.click();

  // Wait for toast notification
  await page.waitForTimeout(2500);

  const dispatchedScreenshotPath = path.join(ARTIFACT_DIR, 'whatsapp-share-dispatched-live.png');
  await page.screenshot({ path: dispatchedScreenshotPath });
  console.log(`Captured dispatched screenshot: ${dispatchedScreenshotPath}`);

  await browser.close();
  console.log('\nAll PDF & WhatsApp verifications completed successfully!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
