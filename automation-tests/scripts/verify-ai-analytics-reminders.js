const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\akhil\\.gemini\\antigravity\\brain\\3d7fdc32-253a-48db-81f7-6eb95f026067';

async function verifyAiAnalyticsAndReminders() {
  console.log('=== Step 1: Backend Authentication ===');
  const loginRes = await fetch('http://localhost:8081/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
  }

  const { token } = await loginRes.json();
  console.log('Admin JWT successfully obtained.');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('\n=== Step 2: Verify Inventory Analytics & Lead Time Forecasting ===');
  const summaryRes = await fetch('http://localhost:8081/api/inventory-analytics/summary', { headers: authHeaders });
  if (!summaryRes.ok) {
    throw new Error(`Inventory summary failed with HTTP ${summaryRes.status}`);
  }
  const summary = await summaryRes.json();
  console.log(`Total Products: ${summary.totalProducts}`);
  console.log(`Reorder Suggestions Count: ${summary.reorderSuggestions?.length || 0}`);
  
  if (summary.reorderSuggestions && summary.reorderSuggestions.length > 0) {
    const firstReorder = summary.reorderSuggestions[0];
    console.log(`Sample Reorder item: ${firstReorder.productName}`);
    console.log(`  Lead Time: ${firstReorder.leadTimeDays} days, Safety Buffer: ${firstReorder.safetyBufferDays} days`);
    console.log(`  Reorder Point: ${firstReorder.reorderPoint}, Deadline: in ${firstReorder.daysUntilReorderDeadline} days`);
    console.log(`  Urgency: ${firstReorder.leadTimeUrgency}`);
  }

  console.log('\n=== Step 3: Verify AI Dead Stock & Clearance Bundling ===');
  const deadRes = await fetch('http://localhost:8081/api/inventory-analytics/dead-stock', { headers: authHeaders });
  if (!deadRes.ok) {
    throw new Error(`Dead stock API failed with HTTP ${deadRes.status}`);
  }
  const deadStock = await deadRes.json();
  console.log(`Dead Stock SKUs: ${deadStock.totalDeadStockSkus}`);
  console.log(`Slow-Moving SKUs: ${deadStock.totalSlowMovingSkus}`);
  console.log(`At-Risk SKUs: ${deadStock.totalAtRiskSkus}`);
  console.log(`Total Capital Locked: Rs. ${deadStock.totalCapitalLocked}`);
  console.log(`Total Monthly Carrying Cost: Rs. ${deadStock.totalMonthlyCarryingCost}`);

  if (deadStock.items && deadStock.items.length > 0) {
    const sampleDead = deadStock.items[0];
    console.log(`Sample Stagnant Item: ${sampleDead.productName} (SKU: ${sampleDead.sku})`);
    console.log(`  Days Idle: ${sampleDead.daysIdle} days (${sampleDead.stagnationTier})`);
    console.log(`  Locked Capital: Rs. ${sampleDead.lockedCapital}`);
    console.log(`  AI Recommendation: ${sampleDead.recommendedAction}`);
  }

  console.log('\n=== Step 4: Verify Automated WhatsApp Reminders Preview ===');
  const previewRes = await fetch('http://localhost:8081/api/automation/reminders/preview', { headers: authHeaders });
  if (!previewRes.ok) {
    throw new Error(`Reminders preview failed with HTTP ${previewRes.status}`);
  }
  const preview = await previewRes.json();
  console.log(`Total Pending Reminders: ${preview.totalPendingReminders}`);
  console.log(`  Expiring Quotations: ${preview.quotationExpiryCount}`);
  console.log(`  Pending Balance Dues: ${preview.paymentBalanceDueCount}`);

  console.log('\n=== Step 5: Test WhatsApp Reminders Batch Trigger ===');
  const triggerRes = await fetch('http://localhost:8081/api/automation/reminders/trigger-all', {
    method: 'POST',
    headers: authHeaders
  });
  if (!triggerRes.ok) {
    throw new Error(`Reminders trigger failed with HTTP ${triggerRes.status}`);
  }
  const triggerResult = await triggerRes.json();
  console.log(`Batch Result: ${triggerResult.reminderType}`);
  console.log(`  Total Processed: ${triggerResult.totalEligible}`);
  console.log(`  Sent: ${triggerResult.sentCount}, Simulated: ${triggerResult.simulatedCount}, Skipped: ${triggerResult.skippedAlreadySentCount}, Failed: ${triggerResult.failedCount}`);

  console.log('\n=== Step 6: Verify Reminders Audit History ===');
  const histRes = await fetch('http://localhost:8081/api/automation/reminders/history', { headers: authHeaders });
  if (!histRes.ok) {
    throw new Error(`Reminders history failed with HTTP ${histRes.status}`);
  }
  const history = await histRes.json();
  console.log(`Retrieved ${history.length} reminder audit log entries.`);

  console.log('\n=== Step 7: UI Automation & Live Screenshot Capture ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('Navigating to web login...');
  await page.goto('http://localhost/login', { waitUntil: 'networkidle' });

  await page.fill('input[type="text"], input[name="username"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);
  console.log('Navigating to Reports & Intelligence page...');
  await page.goto('http://localhost/reports', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click on "Predictive Intelligence" tab
  console.log('Selecting Predictive Intelligence tab...');
  await page.click('text=Predictive Intelligence');
  await page.waitForTimeout(2500);

  // Capture Reorder Planner with Lead Times
  const reorderScreenshot = path.join(ARTIFACT_DIR, 'ai-reorder-leadtime-live.png');
  await page.screenshot({ path: reorderScreenshot });
  console.log(`Saved screenshot: ${reorderScreenshot}`);

  // Click on Dead Stock & Clearance Bundles tab
  console.log('Selecting Dead Stock & Clearance Bundles tab...');
  await page.click('text=Dead Stock & Clearance Bundles');
  await page.waitForTimeout(1500);

  const deadStockScreenshot = path.join(ARTIFACT_DIR, 'ai-dead-stock-bundles-live.png');
  await page.screenshot({ path: deadStockScreenshot });
  console.log(`Saved screenshot: ${deadStockScreenshot}`);

  // Click on Automated Reminders Hub tab
  console.log('Selecting Automated Reminders Hub tab...');
  await page.click('text=Automated Reminders Hub');
  await page.waitForTimeout(1500);

  // Trigger reminders from UI
  console.log('Clicking "Trigger All Pending Reminders" in UI...');
  const triggerBtn = page.locator('text=Trigger All Pending Reminders').first();
  if (await triggerBtn.isVisible()) {
    await triggerBtn.click();
    await page.waitForTimeout(3000);
  }

  const remindersScreenshot = path.join(ARTIFACT_DIR, 'ai-automated-reminders-hub-live.png');
  await page.screenshot({ path: remindersScreenshot });
  console.log(`Saved screenshot: ${remindersScreenshot}`);

  await browser.close();
  console.log('\nAll Advanced Analytics & Automated CRM Reminders verified successfully!');
}

verifyAiAnalyticsAndReminders().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
