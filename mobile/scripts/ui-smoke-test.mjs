import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureOwnedResponse, ownedResource } from './owned-responses.mjs';

const appUrl = process.env.UI_URL || 'http://localhost:19006';
const apiUrl = process.env.API_URL || 'http://localhost:8081/api';
const username = process.env.QA_USERNAME || 'qaadmin';
const password = process.env.QA_PASSWORD || process.env.QA_ADMIN_PASSWORD;
if (!password) throw new Error('QA_PASSWORD or QA_ADMIN_PASSWORD is required before running native smoke');
const dashboardRoles = [
  ['ADMIN', username, password],
  ['MANAGER', process.env.QA_MANAGER_USERNAME || 'qamanager', process.env.QA_MANAGER_PASSWORD || process.env.QA_PASSWORD],
  ['SALES', process.env.QA_SALES_USERNAME || 'qasales', process.env.QA_SALES_PASSWORD || process.env.QA_PASSWORD],
  ['WAREHOUSE', process.env.QA_WAREHOUSE_USERNAME || 'qawarehouse', process.env.QA_WAREHOUSE_PASSWORD || process.env.QA_PASSWORD]
];
for (const [role, , credential] of dashboardRoles) {
  if (!credential) throw new Error(`QA_${role}_PASSWORD or QA_PASSWORD is required for role coverage`);
}
const runLegacySmoke = process.env.RUN_LEGACY_SMOKE === '1';

const phase1Results = [];
const legacyResults = [];
const roleResults = [];
const apiHits = [];
const ownedRecords = [];
const pendingOwnedResponses = [];
const cleanupResults = [];
const browserErrors = [];
const artifactDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../reports');
const journalDir = path.join(artifactDir, 'expo-fixtures');
fs.mkdirSync(journalDir, { recursive: true });
const journalPath = path.join(journalDir, `owned-${Date.now()}.jsonl`);
const ownRecord = (path, body) => {
  const resource = ownedResource(path);
  if (resource && body?.id && !ownedRecords.some(record => record.resource === resource && record.id === body.id)) {
    ownedRecords.push({ resource, id: body.id });
    fs.appendFileSync(journalPath, JSON.stringify({ event: 'created', resource, id: body.id }) + '\n');
  }
};

const record = (collection, area, status, detail = '') => {
  collection.push({ area, status, detail });
};

const apiRequest = async (path, options = {}, token) => {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} returned ${response.status}: ${text}`);
  }
  if (options.method === 'POST') ownRecord(path, body);
  return body;
};

const seedUser = async () => {
  const login = async () => {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.ok ? response.json() : null;
  };

  const existing = await login();
  if (existing) return existing;

  const response = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email: `${username}@example.com`,
      password,
      fullName: 'QA Admin',
      phoneNumber: '9999999999'
    })
  });

  if (response.status !== 201 && response.status !== 400) {
    throw new Error(`Unable to seed user. Status ${response.status}: ${await response.text()}`);
  }

  const created = await login();
  if (!created) throw new Error('Unable to login with the QA account after registration');
  return created;
};

const seedPhase1Data = async (token) => {
  const suffix = Date.now();
  const brand = await apiRequest('/brands', {
    method: 'POST',
    body: JSON.stringify({ name: `Phase 1 Brand ${suffix}`, isActive: true })
  }, token);
  const category = await apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify({ name: `Phase 1 Category ${suffix}`, isActive: true })
  }, token);
  for (let index = 0; index < 51; index++) {
    await apiRequest('/customers', { method: 'POST', body: JSON.stringify({
      name: `Pagination ${suffix}-${index}`, phoneNumber: `7${String(suffix + index).slice(-9)}`, customerType: 'RETAIL'
    }) }, token);
  }
  const customer = await apiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: `Phase 1 Customer ${suffix}`,
      email: `phase1-${suffix}@example.com`,
      phoneNumber: `9${String(suffix).slice(-9)}`,
      company: 'QA Sanitary Store',
      customerType: 'RETAIL',
      billingAddress: '12 QA Street',
      shippingAddress: '12 QA Street',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      isActive: true
    })
  }, token);
  for (let index = 0; index < 51; index++) {
    await apiRequest('/products', { method: 'POST', body: JSON.stringify({
      sku: `PAGING-${suffix}-${index}`, name: `Picker pagination ${suffix}-${index}`,
      categoryId: category.id, brandId: brand.id, mrp: 100, sellingPrice: 100, stockQuantity: 10
    }) }, token);
  }
  const product = await apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify({
      sku: `PHASE1-${suffix}`,
      name: `Phase 1 Basin ${suffix}`,
      categoryId: category.id,
      brandId: brand.id,
      mrp: 1200,
      sellingPrice: 1000,
      purchasePrice: 700,
      stockQuantity: 50,
      reorderLevel: 5,
      unit: 'PCS',
      isActive: true
    })
  }, token);
  return { customer, product };
};

const verifyPhase1Api = async (token, customer, product) => {
  const today = new Date().toISOString().slice(0, 10);
  const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const quotation = await apiRequest('/quotations', {
    method: 'POST',
    body: JSON.stringify({
      customerId: customer.id,
      quotationDate: today,
      validUntil,
      taxPercentage: 18,
      discount: 0,
      items: [{
        productId: product.id,
        quantity: 2,
        unitPrice: 1000,
        discountPercentage: 5,
        lineTotal: 1900
      }]
    })
  }, token);
  await apiRequest(`/quotations/${quotation.id}`, {}, token);
  const order = await apiRequest(`/orders/from-quotation/${quotation.id}`, { method: 'POST' }, token);
  if (Number(order.balanceAmount) !== Number(order.total)) {
    throw new Error(`Converted order balance ${order.balanceAmount} does not equal total ${order.total}`);
  }
  await apiRequest('/payments', {
    method: 'POST',
    body: JSON.stringify({
      orderId: order.id,
      paymentDate: today,
      amount: 500,
      paymentMethod: 'CASH',
      referenceNumber: `SMOKE-${Date.now()}`,
      notes: 'Phase 1 UI smoke API verification'
    })
  }, token);
  const updatedOrder = await apiRequest(`/orders/${order.id}`, {}, token);
  const payments = await apiRequest(`/payments/order/${order.id}`, {}, token);
  if (Number(updatedOrder.paidAmount) !== 500 || Number(updatedOrder.balanceAmount) !== Number(order.total) - 500) {
    throw new Error('Order paid and balance values did not refresh after payment');
  }
  if (!payments.length) throw new Error('Payment history did not contain the new payment');
};

const waitForText = async (page, text, timeout = 15000) => {
  await page.getByText(text, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout });
};

const clickText = async (page, text) => {
  const locator = page.getByText(text, { exact: true }).filter({ visible: true }).first();
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.click();
};

const clickLastText = async (page, text) => {
  const locator = page.getByText(text, { exact: true }).filter({ visible: true }).last();
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.click();
};

const clickTab = async (page, text) => {
  const tab = page.getByRole('tab', { name: text });
  await tab.waitFor({ state: 'visible', timeout: 15000 });
  await tab.click();
};

const checkListScreen = async (page, title) => {
  await page.waitForFunction(() => /\d+\s+records/.test(document.body.innerText), null, { timeout: 15000 });
  const body = await page.locator('body').innerText({ timeout: 5000 });
  if (body.includes('Could not load data')) throw new Error(`${title} list shows an API error`);
};

const fillLabeledInput = async (page, label, value) => {
  const input = page.getByLabel(label, { exact: true }).filter({ visible: true }).first();
  await input.fill(String(value));
};

const reachPagedRecord = async (page, name, buttonLabel, endpoint) => {
  let pagesLoaded = 0;
  let scrollAttempts = 0;
  while (!await page.getByText(name, { exact: true }).filter({ visible: true }).count()) {
    const loadMore = page.getByRole('button', { name: buttonLabel, exact: true });
    if (await loadMore.count()) {
      if (++pagesLoaded > 20) throw new Error('Owned customer not reached within pagination verification budget');
      const nextPage = page.waitForResponse(response => response.url().includes(endpoint + '?') && response.request().method() === 'GET');
      await loadMore.click();
      if (!(await nextPage).ok()) throw new Error(`${endpoint} next page failed`);
      await page.getByText('Loading more...', { exact: true }).waitFor({ state: 'hidden' });
    } else {
      // FlatList virtualizes offscreen rows, including the last-page target. Exercise real scrolling.
      if (++scrollAttempts > 20) throw new Error('Owned customer unavailable after scrolling the loaded list');
      await page.mouse.wheel(0, 1200);
      await page.getByText(name, { exact: true }).filter({ visible: true }).waitFor({ timeout: 500 }).catch(() => {});
    }
  }
  if (!pagesLoaded) throw new Error('Pagination fixture did not exercise a later page');
  return pagesLoaded;
};

const runPhase1Ui = async (page, customer, product) => {
  await clickTab(page, 'Customers');
  await checkListScreen(page, 'Customers');
  const pagesLoaded = await reachPagedRecord(page, customer.name, 'Load more', '/customers');
  record(phase1Results, 'Pagination', 'PASS', `owned customer reached after ${pagesLoaded} additional page(s)`);
  await page.getByPlaceholder('Search customers').fill(customer.name);
  await clickText(page, customer.name);
  await waitForText(page, 'Customer Details');
  record(phase1Results, 'Customer detail', 'PASS', 'customer, quotations, and orders sections visible');

  await clickText(page, 'Create Quotation');
  await waitForText(page, 'New Quotation');
  await clickText(page, 'Product');
  await waitForText(page, 'Select Product');
  const productPages = await reachPagedRecord(page, product.name, 'Load more products', '/products');
  record(phase1Results, 'Picker pagination', 'PASS', `owned product reached after ${productPages} additional page(s)`);
  await clickText(page, product.name);
  await waitForText(page, product.name);
  await fillLabeledInput(page, 'Qty', 2);
  await fillLabeledInput(page, 'Unit Price', 1000);
  await fillLabeledInput(page, 'Disc %', 5);
  await fillLabeledInput(page, 'Total Discount', 25);
  await fillLabeledInput(page, 'Notes', 'Draft retention regression');
  if (await page.getByTestId('quotation-customer').filter({ visible: true }).innerText() !== customer.name) throw new Error('Customer lost after picker return');
  await clickText(page, 'Product');
  await waitForText(page, 'Select Product');
  await clickText(page, 'Cancel');
  await waitForText(page, 'New Quotation');
  for (const [label, expected] of [['Qty', '2'], ['Disc %', '5'], ['Total Discount', '25'], ['Notes', 'Draft retention regression']]) {
    const input = page.getByLabel(label, { exact: true }).filter({ visible: true }).first();
    if (await input.inputValue() !== expected) throw new Error(`${label} lost after picker cancellation`);
  }
  await clickText(page, 'Product');
  await waitForText(page, 'Select Product');
  await page.getByPlaceholder('Search products').fill(product.sku);
  await clickText(page, product.name);
  if (await page.getByTestId('quotation-customer').filter({ visible: true }).innerText() !== customer.name) throw new Error('Customer lost on repeated picker return');
  if (await page.getByText(product.name, { exact: true }).filter({ visible: true }).count() !== 2) throw new Error('Existing line lost on repeated picker return');
  record(phase1Results, 'Quotation form', 'PASS', 'real product selected and line values updated');

  const savedResponse = page.waitForResponse(response => response.url() === `${apiUrl}/quotations` && response.request().method() === 'POST');
  await clickText(page, 'Save Quotation');
  const response = await savedResponse;
  if (!response.ok()) throw new Error(`Quotation save returned ${response.status()}`);
  const saved = await response.json();
  if (saved.customerId !== customer.id || saved.items.length !== 2 || Number(saved.total) !== 3397) {
    throw new Error('Saved quotation customer, retained lines, or financial total differs from draft');
  }
  await waitForText(page, 'Quotation Details', 20000);
  record(phase1Results, 'Save quotation', 'PASS', 'quotation detail opened');

  page.once('dialog', (dialog) => dialog.accept());
  await clickText(page, 'Convert To Order');
  await waitForText(page, 'Order Summary', 20000);
  record(phase1Results, 'Convert to order', 'PASS', 'order detail opened');

  await clickLastText(page, 'Record Payment');
  await waitForText(page, 'Payment Details');
  await fillLabeledInput(page, 'Amount', 500);
  await clickLastText(page, 'Record Payment');
  await waitForText(page, 'Payment History', 20000);
  await waitForText(page, 'CASH', 20000);
  record(phase1Results, 'Record payment', 'PASS', 'order detail refreshed with payment history');
};

const runLegacyUi = async (page) => {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForText(page, 'Total Revenue', 20000);
  for (const title of ['Products', 'Orders']) {
    await clickTab(page, title);
    await checkListScreen(page, title);
    record(legacyResults, title, 'PASS', 'legacy list screen visible');
  }

  const modules = ['Quotations', 'Payments', 'Distributors', 'Purchase Orders', 'Distributor Payments', 'Brands', 'Categories', 'Settings'];
  for (const title of modules) {
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForText(page, 'Total Revenue', 20000);
    await clickTab(page, 'More');
    await waitForText(page, 'More Modules');
    await clickText(page, title);
    await checkListScreen(page, title);
    record(legacyResults, title, 'PASS', 'legacy module visible');
  }
};

let auth;
let seed;
try {
  auth = await seedUser();
  seed = await seedPhase1Data(auth.token);
  await verifyPhase1Api(auth.token, seed.customer, seed.product);
  record(phase1Results, 'Phase 1 API', 'PASS', 'quotation, conversion, payment, and refreshed balance verified');
} catch (error) {
  record(phase1Results, 'Phase 1 API', 'FAIL', error.message);
}

let browser;
try {
browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const page = await context.newPage();
page.on('pageerror', error => browserErrors.push(error.message));

page.on('response', (response) => {
  if (response.url().startsWith(apiUrl)) {
    apiHits.push({
      method: response.request().method(),
      url: response.url().replace(apiUrl, ''),
      status: response.status()
    });
    const pending = captureOwnedResponse(response, apiUrl, ownRecord, error => browserErrors.push(error));
    if (pending) pendingOwnedResponses.push(pending);
  }
});

try {
  if (!seed) throw new Error('Phase 1 seed data unavailable');
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForText(page, 'Sanitaryware CRM');
  await page.getByPlaceholder('admin').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await clickText(page, 'Sign In');
  await waitForText(page, 'Total Revenue', 20000);
  record(phase1Results, 'Login', 'PASS', 'dashboard reached after form login');
  await runPhase1Ui(page, seed.customer, seed.product);
  await page.screenshot({ path: path.join(artifactDir, 'expo-phase1.png'), fullPage: true });
} catch (error) {
  record(phase1Results, 'Phase 1 UI', 'BLOCKED', error.message);
  await page.screenshot({ path: path.join(artifactDir, 'expo-phase1-blocked.png'), fullPage: true }).catch(() => {});
}

if (runLegacySmoke) {
  try {
    await runLegacyUi(page);
  } catch (error) {
    record(legacyResults, 'Legacy smoke', 'BLOCKED', `${error.message} (unrelated to Phase 1 workflow)`);
  }
} else {
  record(legacyResults, 'Legacy smoke', 'SKIPPED', 'Set RUN_LEGACY_SMOKE=1 to run unrelated generic module navigation');
}

for (const [role, roleUsername, rolePassword] of dashboardRoles) {
  try {
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByPlaceholder('admin').fill(roleUsername);
    await page.getByPlaceholder('Password').fill(rolePassword);
    const statsResponse = page.waitForResponse(response => response.url() === `${apiUrl}/dashboard/stats`);
    await clickText(page, 'Sign In');
    const response = await statsResponse;
    if (!response.ok()) throw new Error(`${role} dashboard returned ${response.status()}`);
    const stats = await response.json();
    await page.getByText('Low Stock', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    const management = ['ADMIN', 'MANAGER'].includes(role);
    const revenueVisible = await page.getByText('Total Revenue', { exact: true }).isVisible();
    if (revenueVisible !== management) throw new Error(`${role} financial widget policy mismatch`);
    for (const key of ['totalRevenue', 'totalReceivables', 'totalPayables', 'distributorPaymentsTotal', 'monthlyRevenue', 'topProducts']) {
      if (Object.hasOwn(stats, key) !== management) throw new Error(`${role} response field policy mismatch: ${key}`);
    }
    record(roleResults, role, 'PASS', 'real logout/login, operational widgets and financial field boundaries verified');
    await page.screenshot({ path: path.join(artifactDir, `expo-role-${role.toLowerCase()}.png`), fullPage: true });
  } catch (error) { record(roleResults, role, 'FAIL', error.message); }
}
} catch (error) {
  record(phase1Results, 'Browser runtime', 'FAIL', error.message);
} finally {
await Promise.all(pendingOwnedResponses);
if (browser) await browser.close().catch(error => browserErrors.push(error.message));
if (auth) {
  for (const record of [...ownedRecords].reverse()) {
    try {
      let path = `/${record.resource}/${record.id}`;
      if (record.resource === 'quotations') {
        const quotation = await apiRequest(path, {}, auth.token);
        path = `/qa/quotations/${record.id}?customerName=${encodeURIComponent(quotation.customerName)}`;
      }
      await apiRequest(path, { method: 'DELETE' }, auth.token);
      cleanupResults.push({ ...record, status: 'PASS' });
      fs.appendFileSync(journalPath, JSON.stringify({ event: 'cleaned', ...record }) + '\n');
    } catch (error) {
      cleanupResults.push({ ...record, status: 'FAIL', detail: error.message });
    }
  }
}
}

const phase1ApiPassed = phase1Results.some((result) => result.area === 'Phase 1 API' && result.status === 'PASS');
const phase1UiBlocked = phase1Results.some((result) => result.status === 'BLOCKED');
console.log(JSON.stringify({
  summary: {
    phase1Api: phase1ApiPassed ? 'VERIFIED' : 'FAILED',
    phase1Ui: phase1UiBlocked ? 'BLOCKED_BY_ENVIRONMENT_OR_UI' : 'VERIFIED',
    legacySmoke: runLegacySmoke ? 'ISOLATED' : 'SKIPPED_UNRELATED_TO_PHASE_1'
  },
  phase1Results,
  legacyResults,
  roleResults,
  apiHits,
  browserErrors,
  journalPath,
  cleanupResults
}, null, 2));

if (!phase1ApiPassed || phase1UiBlocked
  || phase1Results.some((result) => result.status === 'FAIL')
  || legacyResults.some((result) => result.status === 'FAIL' || result.status === 'BLOCKED')
  || roleResults.some(result => result.status !== 'PASS')
  || browserErrors.length || cleanupResults.some(result => result.status === 'FAIL')) {
  process.exit(1);
}
