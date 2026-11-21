/**
 * FULL SYSTEM QA AUDIT: 100 TEST CASES (POSITIVE & NEGATIVE)
 * Covers:
 * - Suite 1: Quotations Lifecycle & Tokenized Portal (20 cases: 10 POS, 10 NEG)
 * - Suite 2: Order Management & Atomic Stock Reservation (20 cases: 10 POS, 10 NEG)
 * - Suite 3: Payments & Financial Ledger Invariants (20 cases: 10 POS, 10 NEG)
 * - Suite 4: Procurement & Distributors (15 cases: 8 POS, 7 NEG)
 * - Suite 5: Dashboard, KPI & Audit Reporting (10 cases: 6 POS, 4 NEG)
 * - Suite 6: Catalog PDF Bulk Import & Extraction (15 cases: 8 POS, 7 NEG)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = process.env.BASE_URL || 'http://localhost';
const API_URL = `${BASE_URL}:8081/api`;

const results = [];

function record(id, suite, name, type, expected, actual, passed, details = '') {
  results.push({
    id,
    suite,
    name,
    type,
    expected: String(expected),
    actual: String(actual),
    passed: Boolean(passed),
    details: details ? String(details) : ''
  });
  const tag = passed ? '[PASS]' : '[FAIL]';
  console.log(`${tag} ${id} [${type}] ${name}`);
  if (!passed) {
    console.log(`   Expected: ${expected} | Actual: ${actual} | Details: ${details}`);
  }
}

async function request(endpoint, options = {}, token = null) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else if (contentType.includes('application/pdf')) {
    data = await res.arrayBuffer().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  return { status: res.status, headers: res.headers, data };
}

async function runAudit() {
  console.log('========================================================================');
  console.log('   FULL SYSTEM QA AUDIT: 100 TEST CASES (POSITIVE & NEGATIVE)          ');
  console.log('   Covering Quotes, Orders, Payments, Procurement, Analytics & PDF     ');
  console.log('========================================================================\n');

  // Generate catalog PDFs with a fresh SKU suffix
  const skuSuffix = 'S' + String(Date.now()).slice(-4);
  execSync(`python automation-tests/scripts/generate-catalog-pdf.py ${skuSuffix}`, { stdio: 'inherit' });

  // 1. Authenticate as ADMIN
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' }
  });
  if (loginRes.status !== 200 || !loginRes.data?.token) {
    throw new Error(`Admin authentication failed: ${loginRes.status}`);
  }
  const token = loginRes.data.token;
  console.log('Authenticated as ADMIN. Test suite initialized.\n');

  // Setup seed entities for this run
  const ts = Date.now().toString().slice(-4);
  const today = '2026-11-16';

  const custRes = await request('/customers', {
    method: 'POST',
    body: {
      name: `Audit Customer ${ts}`,
      phoneNumber: `976543${ts}`,
      email: `audit.${ts}@sanitaryware.com`,
      customerType: 'BUILDER',
      address: 'Industrial Area Phase 2, Staging City',
      gstNumber: '27AABCS1429B1Z0'
    }
  }, token);
  const customerId = custRes.data?.id;

  const catRes = await request('/categories', {
    method: 'POST',
    body: { name: `Audit Category ${ts}`, description: 'Test sanitaryware fixtures' }
  }, token);
  const categoryId = catRes.data.id;

  const brdRes = await request('/brands', {
    method: 'POST',
    body: { name: `Audit Brand ${ts}` }
  }, token);
  const brandId = brdRes.data.id;

  const prodRes = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-AUDIT-${ts}`,
      name: `Audit Washbasin ${ts}`,
      categoryId,
      brandId,
      mrp: 8000.0,
      sellingPrice: 6000.0,
      stockQuantity: 100,
      reorderLevel: 10,
      gstRate: 18.0
    }
  }, token);
  const productId = prodRes.data.id;

  let quotationId = null;
  let quotationShareToken = null;
  let orderId = null;
  let directOrderId = null;
  let distributorId = null;
  let purchaseOrderId = null;

  // ========================================================================
  // SUITE 1: QUOTATION LIFECYCLE (20 CASES: 10 POS, 10 NEG)
  // ========================================================================
  console.log('--- Suite 1: Quotations Lifecycle (20 Cases) ---');

  // TC-QT-01 [POS]: Create valid quotation with line item & discount
  let res = await request('/quotations', {
    method: 'POST',
    body: {
      customerId,
      quotationDate: today,
      validUntil: '2026-12-31',
      taxPercentage: 18.0,
      items: [{ productId, quantity: 2, unitPrice: 6000.0, discountPercentage: 10.0 }]
    }
  }, token);
  let passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  quotationId = res.data?.id;
  quotationShareToken = res.data?.shareToken;
  record('TC-QT-01', 'Quotations', 'Create valid quotation with line item & discount', 'POSITIVE', '200/201 Created', res.status, passed, `Quote ID: ${quotationId}`);

  // TC-QT-02 [POS]: Line item subtotal calculation (2 * 6000 - 10% = 10800)
  const lineTotal = res.data?.items?.[0]?.lineTotal;
  passed = lineTotal === 10800.0;
  record('TC-QT-02', 'Quotations', 'Verify mathematical line item discount calculation', 'POSITIVE', '10800.00', lineTotal, passed);

  // TC-QT-03 [POS]: Verify GST tax calculation (18% on 10800 = 1944)
  const taxAmount = res.data?.taxAmount;
  passed = Math.abs(taxAmount - 1944.0) < 0.01;
  record('TC-QT-03', 'Quotations', 'Verify 18% GST tax calculation', 'POSITIVE', '1944.00', taxAmount, passed);

  // TC-QT-04 [POS]: Verify Grand Total (10800 + 1944 = 12744)
  const totalAmount = res.data?.total;
  passed = Math.abs(totalAmount - 12744.0) < 0.01;
  record('TC-QT-04', 'Quotations', 'Verify Grand Total precision calculation', 'POSITIVE', '12744.00', totalAmount, passed);

  // TC-QT-05 [POS]: Retrieve quotation by ID
  res = await request(`/quotations/${quotationId}`, {}, token);
  passed = res.status === 200 && res.data.id === quotationId;
  record('TC-QT-05', 'Quotations', 'Retrieve quotation by ID', 'POSITIVE', '200 OK', res.status, passed);

  // TC-QT-06 [POS]: Public unauthenticated customer portal access via shareToken
  res = await request(`/portal/quotations/${quotationShareToken}`, {});
  passed = res.status === 200 && res.data.id === quotationId;
  record('TC-QT-06', 'Quotations', 'Public unauthenticated customer portal access', 'POSITIVE', '200 OK', res.status, passed);

  // TC-QT-07 [POS]: Customer accepts quotation via public portal (1-click approval)
  res = await request(`/portal/quotations/${quotationShareToken}/accept`, { method: 'POST' });
  passed = res.status === 200 && res.data.status === 'ACCEPTED';
  record('TC-QT-07', 'Quotations', 'Customer 1-click self-service approval via portal', 'POSITIVE', '200 OK (Status ACCEPTED)', res.data?.status, passed);

  // TC-QT-08 [POS]: Verify real-time status update in CRM backend
  res = await request(`/quotations/${quotationId}`, {}, token);
  passed = res.status === 200 && res.data.status === 'ACCEPTED';
  record('TC-QT-08', 'Quotations', 'Quotation status synchronization in CRM', 'POSITIVE', 'ACCEPTED', res.data?.status, passed);

  // TC-QT-09 [POS]: Query quotations by customer ID
  res = await request(`/quotations/customer/${customerId}`, {}, token);
  passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
  record('TC-QT-09', 'Quotations', 'Query quotations by customer ID', 'POSITIVE', '200 OK with results', res.status, passed);

  // TC-QT-10 [POS]: Generate Quotation PDF estimate via portal
  res = await request(`/portal/quotations/${quotationShareToken}/pdf`, {});
  passed = res.status === 200;
  record('TC-QT-10', 'Quotations', 'Quotation PDF generation endpoint', 'POSITIVE', '200 OK with PDF bytes', res.status, passed);

  // --- NEGATIVE QUOTATION TESTS ---
  // TC-QT-11 [NEG]: Missing customer ID
  res = await request('/quotations', {
    method: 'POST',
    body: { quotationDate: today, validUntil: '2026-12-31', items: [{ productId, quantity: 1, unitPrice: 1000 }] }
  }, token);
  record('TC-QT-11', 'Quotations', 'Missing customer ID rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-QT-12 [NEG]: Empty items list
  res = await request('/quotations', {
    method: 'POST',
    body: { customerId, quotationDate: today, validUntil: '2026-12-31', items: [] }
  }, token);
  record('TC-QT-12', 'Quotations', 'Empty items list rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-QT-13 [NEG]: Zero item quantity
  res = await request('/quotations', {
    method: 'POST',
    body: { customerId, quotationDate: today, validUntil: '2026-12-31', items: [{ productId, quantity: 0, unitPrice: 1000 }] }
  }, token);
  record('TC-QT-13', 'Quotations', 'Zero item quantity rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-QT-14 [NEG]: Negative item quantity
  res = await request('/quotations', {
    method: 'POST',
    body: { customerId, quotationDate: today, validUntil: '2026-12-31', items: [{ productId, quantity: -2, unitPrice: 1000 }] }
  }, token);
  record('TC-QT-14', 'Quotations', 'Negative item quantity rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-QT-15 [NEG]: Negative unit price
  res = await request('/quotations', {
    method: 'POST',
    body: { customerId, quotationDate: today, validUntil: '2026-12-31', items: [{ productId, quantity: 1, unitPrice: -500 }] }
  }, token);
  record('TC-QT-15', 'Quotations', 'Negative unit price rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-QT-16 [NEG]: Negative discount percentage rejection
  res = await request('/quotations', {
    method: 'POST',
    body: { customerId, quotationDate: today, validUntil: '2026-12-31', items: [{ productId, quantity: 1, unitPrice: 1000, discountPercentage: -10.0 }] }
  }, token);
  record('TC-QT-16', 'Quotations', 'Negative discount percentage rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-QT-17 [NEG]: Non-existent product ID
  res = await request('/quotations', {
    method: 'POST',
    body: { customerId, quotationDate: today, validUntil: '2026-12-31', items: [{ productId: 999999, quantity: 1, unitPrice: 1000 }] }
  }, token);
  record('TC-QT-17', 'Quotations', 'Non-existent product ID rejection', 'NEGATIVE', '400/404', res.status, res.status === 400 || res.status === 404);

  // TC-QT-18 [NEG]: Non-existent customer ID
  res = await request('/quotations', {
    method: 'POST',
    body: { customerId: 999999, quotationDate: today, validUntil: '2026-12-31', items: [{ productId, quantity: 1, unitPrice: 1000 }] }
  }, token);
  record('TC-QT-18', 'Quotations', 'Non-existent customer ID rejection', 'NEGATIVE', '400/404', res.status, res.status === 400 || res.status === 404);

  // TC-QT-19 [NEG]: Non-existent quotation ID
  res = await request('/quotations/999999', {}, token);
  record('TC-QT-19', 'Quotations', 'Get non-existent quotation ID', 'NEGATIVE', '404 Not Found', res.status, res.status === 404);

  // TC-QT-20 [NEG]: Access invalid token on public customer portal
  res = await request('/portal/quotations/INVALID_FORGED_TOKEN', {});
  record('TC-QT-20', 'Quotations', 'Invalid portal token access', 'NEGATIVE', '404 Not Found', res.status, res.status === 404);

  // ========================================================================
  // SUITE 2: ORDER MANAGEMENT & ATOMIC STOCK RESERVATION (20 CASES: 10 POS, 10 NEG)
  // ========================================================================
  console.log('\n--- Suite 2: Order Management & Inventory Reservation (20 Cases) ---');

  // Check product stock before conversion (should be 100)
  const stockInitial = (await request(`/products/${productId}`, {}, token)).data.stockQuantity;

  // TC-ORD-01 [POS]: Convert accepted quotation to official order via /orders/from-quotation/{id}
  res = await request(`/orders/from-quotation/${quotationId}`, { method: 'POST' }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  orderId = res.data?.id;
  record('TC-ORD-01', 'Orders', 'Convert accepted quotation into official Order', 'POSITIVE', '200/201 Created', res.status, passed, `Order ID: ${orderId}`);

  // TC-ORD-02 [POS]: Initial converted order state is PENDING with stock unreserved
  passed = res.data.status === 'PENDING' && (await request(`/products/${productId}`, {}, token)).data.stockQuantity === stockInitial;
  record('TC-ORD-02', 'Orders', 'Order initial state is PENDING and preserves stock', 'POSITIVE', 'PENDING with Stock 100', `${res.data.status} with Stock ${(await request(`/products/${productId}`, {}, token)).data.stockQuantity}`, passed);

  // TC-ORD-03 [POS]: Retrieve order by ID
  res = await request(`/orders/${orderId}`, {}, token);
  passed = res.status === 200 && res.data.id === orderId;
  record('TC-ORD-03', 'Orders', 'Get order by ID', 'POSITIVE', '200 OK', res.status, passed);

  // TC-ORD-04 [POS]: Advance order status to CONFIRMED -> Atomic stock reservation triggers!
  res = await request(`/orders/${orderId}/status?status=CONFIRMED`, { method: 'PATCH' }, token);
  const stockAfterConfirm = (await request(`/products/${productId}`, {}, token)).data.stockQuantity;
  passed = res.status === 200 && res.data.status === 'CONFIRMED' && stockAfterConfirm === stockInitial - 2;
  record('TC-ORD-04', 'Orders', 'Advance to CONFIRMED triggers atomic stock reservation (-2)', 'POSITIVE', `${stockInitial - 2}`, stockAfterConfirm, passed);

  // TC-ORD-05 [POS]: Advance order status to PROCESSING
  res = await request(`/orders/${orderId}/status?status=PROCESSING`, { method: 'PATCH' }, token);
  passed = res.status === 200 && res.data.status === 'PROCESSING';
  record('TC-ORD-05', 'Orders', 'Advance order status to PROCESSING', 'POSITIVE', 'PROCESSING', res.data?.status, passed);

  // TC-ORD-06 [POS]: Advance order status to SHIPPED
  res = await request(`/orders/${orderId}/status?status=SHIPPED`, { method: 'PATCH' }, token);
  passed = res.status === 200 && res.data.status === 'SHIPPED';
  record('TC-ORD-06', 'Orders', 'Advance order status to SHIPPED', 'POSITIVE', 'SHIPPED', res.data?.status, passed);

  // TC-ORD-07 [POS]: Direct order creation with CONFIRMED status reserves stock immediately
  const stockBeforeDirect = (await request(`/products/${productId}`, {}, token)).data.stockQuantity;
  const directOrderRes = await request('/orders', {
    method: 'POST',
    body: {
      customerId,
      orderDate: today,
      status: 'CONFIRMED',
      items: [{ productId, quantity: 3, unitPrice: 6000.0 }]
    }
  }, token);
  directOrderId = directOrderRes.data?.id;
  const stockAfterDirect = (await request(`/products/${productId}`, {}, token)).data.stockQuantity;
  passed = (directOrderRes.status === 201 || directOrderRes.status === 200) && !!directOrderId && stockAfterDirect === stockBeforeDirect - 3;
  record('TC-ORD-07', 'Orders', 'Direct CONFIRMED order entry reserves stock (-3)', 'POSITIVE', `${stockBeforeDirect - 3}`, stockAfterDirect, passed, `Direct Order ID: ${directOrderId}`);

  // TC-ORD-08 [POS]: Order cancellation atomically restores inventory stock (+3)
  res = await request(`/orders/${directOrderId}/status?status=CANCELLED`, { method: 'PATCH' }, token);
  const stockAfterCancel = (await request(`/products/${productId}`, {}, token)).data.stockQuantity;
  passed = res.status === 200 && stockAfterCancel === stockBeforeDirect;
  record('TC-ORD-08', 'Orders', 'Order cancellation atomically restores inventory stock', 'POSITIVE', `${stockBeforeDirect}`, stockAfterCancel, passed);

  // TC-ORD-09 [POS]: List orders directory with pagination
  res = await request('/orders?page=0&size=20', {}, token);
  passed = res.status === 200 && (res.data.content || res.data).length > 0;
  record('TC-ORD-09', 'Orders', 'List orders directory with pagination', 'POSITIVE', '200 OK with content', res.status, passed);

  // TC-ORD-10 [POS]: Query orders by customer ID
  res = await request(`/orders/customer/${customerId}`, {}, token);
  passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
  record('TC-ORD-10', 'Orders', 'Get orders by customer ID endpoint', 'POSITIVE', '200 OK with orders', res.status, passed);

  // --- NEGATIVE ORDER TESTS ---
  // TC-ORD-11 [NEG]: Attempt duplicate conversion of already-converted quotation
  res = await request(`/orders/from-quotation/${quotationId}`, { method: 'POST' }, token);
  record('TC-ORD-11', 'Orders', 'Duplicate quotation conversion rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-ORD-12 [NEG]: Order requesting more stock than available
  res = await request('/orders', {
    method: 'POST',
    body: {
      customerId,
      orderDate: today,
      status: 'CONFIRMED',
      items: [{ productId, quantity: 999999, unitPrice: 6000.0 }]
    }
  }, token);
  record('TC-ORD-12', 'Orders', 'Order exceeding available stock rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-ORD-13 [NEG]: Missing customer on direct order
  res = await request('/orders', {
    method: 'POST',
    body: { orderDate: today, items: [{ productId, quantity: 1, unitPrice: 6000.0 }] }
  }, token);
  record('TC-ORD-13', 'Orders', 'Missing customer on direct order rejection', 'NEGATIVE', '400/409', res.status, res.status === 400 || res.status === 409);

  // TC-ORD-14 [NEG]: Missing orderDate on direct order
  res = await request('/orders', {
    method: 'POST',
    body: { customerId, items: [{ productId, quantity: 1, unitPrice: 6000.0 }] }
  }, token);
  record('TC-ORD-14', 'Orders', 'Missing orderDate on direct order rejection', 'NEGATIVE', '400/409', res.status, res.status === 400 || res.status === 409);

  // TC-ORD-15 [NEG]: Negative quantity on order
  res = await request('/orders', {
    method: 'POST',
    body: { customerId, orderDate: today, items: [{ productId, quantity: -5, unitPrice: 6000.0 }] }
  }, token);
  record('TC-ORD-15', 'Orders', 'Negative quantity on order rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-ORD-16 [NEG]: Invalid order status transition (from CANCELLED back to CONFIRMED)
  res = await request(`/orders/${directOrderId}/status?status=CONFIRMED`, { method: 'PATCH' }, token);
  record('TC-ORD-16', 'Orders', 'Invalid order status transition rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-ORD-17 [NEG]: Status update on non-existent order ID
  res = await request('/orders/999999/status?status=CONFIRMED', { method: 'PATCH' }, token);
  record('TC-ORD-17', 'Orders', 'Status update on non-existent order ID', 'NEGATIVE', '404 Not Found', res.status, res.status === 404);

  // TC-ORD-18 [NEG]: Retrieve non-existent order ID
  res = await request('/orders/999999', {}, token);
  record('TC-ORD-18', 'Orders', 'Retrieve non-existent order ID', 'NEGATIVE', '404 Not Found', res.status, res.status === 404);

  // TC-ORD-19 [NEG]: Direct order with non-existent product
  res = await request('/orders', {
    method: 'POST',
    body: { customerId, orderDate: today, items: [{ productId: 999999, quantity: 1, unitPrice: 6000.0 }] }
  }, token);
  record('TC-ORD-19', 'Orders', 'Order with non-existent product rejection', 'NEGATIVE', '400/404', res.status, res.status === 400 || res.status === 404);

  // TC-ORD-20 [NEG]: Direct order with non-existent customer
  res = await request('/orders', {
    method: 'POST',
    body: { customerId: 999999, orderDate: today, items: [{ productId, quantity: 1, unitPrice: 6000.0 }] }
  }, token);
  record('TC-ORD-20', 'Orders', 'Order with non-existent customer rejection', 'NEGATIVE', '400/404', res.status, res.status === 400 || res.status === 404);

  // ========================================================================
  // SUITE 3: PAYMENTS & FINANCIAL LEDGER INVARIANTS (20 CASES: 10 POS, 10 NEG)
  // ========================================================================
  console.log('\n--- Suite 3: Payments & Financial Ledger (20 Cases) ---');

  // Order Total is 12744.00
  let paymentId1 = null;

  // TC-PAY-01 [POS]: Record 50% partial advance payment (Rs. 6372.00) via BANK_TRANSFER
  res = await request('/payments', {
    method: 'POST',
    body: {
      orderId,
      amount: 6372.0,
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: today,
      referenceNumber: `TXN-ADV-${ts}`,
      notes: '50% advance via Bank Transfer'
    }
  }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  paymentId1 = res.data?.id;
  record('TC-PAY-01', 'Payments', 'Record 50% partial advance payment', 'POSITIVE', '200/201 Created', res.status, passed, `Payment ID: ${paymentId1}`);

  // TC-PAY-02 [POS]: Verify order payment status reflects PARTIAL
  let orderData = (await request(`/orders/${orderId}`, {}, token)).data;
  passed = orderData.paymentStatus === 'PARTIAL';
  record('TC-PAY-02', 'Payments', 'Order payment status reflects PARTIAL', 'POSITIVE', 'PARTIAL', orderData.paymentStatus, passed);

  // TC-PAY-03 [POS]: Verify remaining balance recalculation (12744 - 6372 = 6372)
  passed = Math.abs(orderData.balanceAmount - 6372.0) < 0.01;
  record('TC-PAY-03', 'Payments', 'Order remaining balance recalculation', 'POSITIVE', '6372.00', orderData.balanceAmount, passed);

  // TC-PAY-04 [POS]: Record UPI payment of Rs. 1000
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: 1000.0, paymentMethod: 'UPI', paymentDate: today, referenceNumber: `TXN-UPI-${ts}` }
  }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  record('TC-PAY-04', 'Payments', 'Process payment via UPI mode', 'POSITIVE', '200/201 Created', res.status, passed);

  // TC-PAY-05 [POS]: Record CASH payment of Rs. 1000
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: 1000.0, paymentMethod: 'CASH', paymentDate: today, referenceNumber: `TXN-CASH-${ts}` }
  }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  record('TC-PAY-05', 'Payments', 'Process payment via CASH mode', 'POSITIVE', '200/201 Created', res.status, passed);

  // TC-PAY-06 [POS]: Record CHEQUE payment of Rs. 1000
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: 1000.0, paymentMethod: 'CHEQUE', paymentDate: today, referenceNumber: `CHQ-${ts}` }
  }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  record('TC-PAY-06', 'Payments', 'Process payment via CHEQUE mode', 'POSITIVE', '200/201 Created', res.status, passed);

  // TC-PAY-07 [POS]: Final settlement payment (Remaining: 6372 - 3000 = 3372.00)
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: 3372.0, paymentMethod: 'BANK_TRANSFER', paymentDate: today, referenceNumber: `TXN-SETTLE-${ts}` }
  }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  record('TC-PAY-07', 'Payments', 'Final settlement payment recording', 'POSITIVE', '200/201 Created', res.status, passed);

  // TC-PAY-08 [POS]: Order payment status reaches PAID with exactly 0.00 balance
  orderData = (await request(`/orders/${orderId}`, {}, token)).data;
  passed = orderData.paymentStatus === 'PAID' && Math.abs(orderData.balanceAmount) < 0.01;
  record('TC-PAY-08', 'Payments', 'Order payment status reaches PAID with 0.00 balance', 'POSITIVE', 'PAID with balance 0.00', `${orderData.paymentStatus} (bal: ${orderData.balanceAmount})`, passed);

  // TC-PAY-09 [POS]: Zero balance drift invariant: sum of payments equals order total
  const paymentsList = (await request(`/payments/order/${orderId}`, {}, token)).data;
  const payments = Array.isArray(paymentsList) ? paymentsList : [];
  const sumPayments = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  passed = Math.abs(sumPayments - orderData.total) < 0.01 && payments.length === 5;
  record('TC-PAY-09', 'Payments', 'Zero balance drift: Sum of ledger payments equals Grand Total', 'POSITIVE', '12744.00', sumPayments, passed);

  // TC-PAY-10 [POS]: Retrieve payment receipt by payment ID
  res = await request(`/payments/${paymentId1}`, {}, token);
  passed = res.status === 200 && res.data.id === paymentId1;
  record('TC-PAY-10', 'Payments', 'Get payment receipt details by payment ID', 'POSITIVE', '200 OK', res.status, passed);

  // --- NEGATIVE PAYMENT TESTS ---
  // TC-PAY-11 [NEG]: Attempt overpayment on fully settled order (Rs. 500 on 0 balance)
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: 500.0, paymentMethod: 'CASH', paymentDate: today }
  }, token);
  record('TC-PAY-11', 'Payments', 'Overpayment rejection on fully settled order', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-PAY-12 [NEG]: Zero payment amount
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: 0.0, paymentMethod: 'CASH', paymentDate: today }
  }, token);
  record('TC-PAY-12', 'Payments', 'Zero payment amount rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-PAY-13 [NEG]: Negative payment amount
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: -500.0, paymentMethod: 'CASH', paymentDate: today }
  }, token);
  record('TC-PAY-13', 'Payments', 'Negative payment amount rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-PAY-14 [NEG]: Missing payment method
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: 100.0, paymentDate: today }
  }, token);
  record('TC-PAY-14', 'Payments', 'Missing payment method rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-PAY-15 [NEG]: Invalid payment method enum
  res = await request('/payments', {
    method: 'POST',
    body: { orderId, amount: 100.0, paymentMethod: 'CRYPTO_COIN', paymentDate: today }
  }, token);
  record('TC-PAY-15', 'Payments', 'Invalid payment method enum rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-PAY-16 [NEG]: Missing order ID
  res = await request('/payments', {
    method: 'POST',
    body: { amount: 100.0, paymentMethod: 'CASH', paymentDate: today }
  }, token);
  record('TC-PAY-16', 'Payments', 'Missing order ID on payment rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-PAY-17 [NEG]: Payment on non-existent order ID
  res = await request('/payments', {
    method: 'POST',
    body: { orderId: 999999, amount: 100.0, paymentMethod: 'CASH', paymentDate: today }
  }, token);
  record('TC-PAY-17', 'Payments', 'Payment against non-existent order ID', 'NEGATIVE', '400/404', res.status, res.status === 400 || res.status === 404);

  // TC-PAY-18 [NEG]: Retrieve non-existent payment ID
  res = await request('/payments/999999', {}, token);
  record('TC-PAY-18', 'Payments', 'Retrieve non-existent payment ID', 'NEGATIVE', '404 Not Found', res.status, res.status === 404);

  // TC-PAY-19 [NEG]: Query payments for non-existent order ID
  res = await request('/payments/order/999999', {}, token);
  record('TC-PAY-19', 'Payments', 'Query payments for non-existent order', 'NEGATIVE', '400/404', res.status, res.status === 400 || res.status === 404);

  // TC-PAY-20 [NEG]: Payment on CANCELLED order rejection
  res = await request('/payments', {
    method: 'POST',
    body: { orderId: directOrderId, amount: 100.0, paymentMethod: 'CASH', paymentDate: today }
  }, token);
  record('TC-PAY-20', 'Payments', 'Payment on cancelled order rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // ========================================================================
  // SUITE 4: PROCUREMENT & DISTRIBUTORS (15 CASES: 8 POS, 7 NEG)
  // ========================================================================
  console.log('\n--- Suite 4: Procurement & Distributors (15 Cases) ---');

  // TC-DIST-01 [POS]: Create new Distributor supplier profile
  res = await request('/distributors', {
    method: 'POST',
    body: {
      name: `Kohler Direct Supplies ${ts}`,
      contactPerson: 'Arun Verma',
      phoneNumber: `965432${ts}`,
      email: `supplies.${ts}@kohler-vendor.in`,
      address: 'Plot 45, Sanitaryware Logistics Park, Bhiwandi',
      city: 'Thane',
      state: 'Maharashtra',
      pincode: '421302',
      gstNumber: '27AABCK9921D1ZZ'
    }
  }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  distributorId = res.data?.id;
  record('TC-DIST-01', 'Distributors', 'Create new Distributor supplier profile', 'POSITIVE', '200/201 Created', res.status, passed, `Distributor ID: ${distributorId}`);

  // TC-DIST-02 [POS]: Get distributor by ID
  res = await request(`/distributors/${distributorId}`, {}, token);
  passed = res.status === 200 && res.data.id === distributorId;
  record('TC-DIST-02', 'Distributors', 'Get distributor by ID', 'POSITIVE', '200 OK', res.status, passed);

  // TC-DIST-03 [POS]: List distributors directory
  res = await request('/distributors', {}, token);
  passed = res.status === 200 && (res.data.content || res.data).length > 0;
  record('TC-DIST-03', 'Distributors', 'List distributors directory', 'POSITIVE', '200 OK with list', res.status, passed);

  // TC-DIST-04 [POS]: Create Purchase Order (PO) for distributor
  res = await request('/purchase-orders', {
    method: 'POST',
    body: {
      distributorId,
      orderDate: today,
      status: 'DRAFT',
      notes: 'Monthly replenishment order',
      items: [{ productId, quantity: 50, unitCost: 3000.0 }]
    }
  }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  purchaseOrderId = res.data?.id;
  record('TC-DIST-04', 'Distributors', 'Create Purchase Order (PO) for distributor', 'POSITIVE', '200/201 Created', res.status, passed, `PO ID: ${purchaseOrderId}`);

  // TC-DIST-05 [POS]: Retrieve Purchase Order by ID
  res = await request(`/purchase-orders/${purchaseOrderId}`, {}, token);
  passed = res.status === 200 && res.data.id === purchaseOrderId;
  record('TC-DIST-05', 'Distributors', 'Get Purchase Order by ID', 'POSITIVE', '200 OK', res.status, passed);

  // TC-DIST-06 [POS]: Receive PO fulfillment -> Inventory stock increments atomically (+50)
  const stockBeforePO = (await request(`/products/${productId}`, {}, token)).data.stockQuantity;
  res = await request(`/purchase-orders/${purchaseOrderId}/status?status=RECEIVED`, { method: 'PATCH' }, token);
  const stockAfterPO = (await request(`/products/${productId}`, {}, token)).data.stockQuantity;
  passed = res.status === 200 && stockAfterPO === stockBeforePO + 50;
  record('TC-DIST-06', 'Distributors', 'PO fulfillment automatically increments inventory stock (+50)', 'POSITIVE', `${stockBeforePO + 50}`, stockAfterPO, passed);

  // TC-DIST-07 [POS]: Record distributor supplier payment
  res = await request('/distributor-payments', {
    method: 'POST',
    body: {
      distributorId,
      purchaseOrderId,
      amount: 50000.0,
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: today,
      referenceNumber: `PO-NEFT-${ts}`
    }
  }, token);
  passed = (res.status === 200 || res.status === 201) && !!res.data.id;
  record('TC-DIST-07', 'Distributors', 'Record payment made to distributor supplier', 'POSITIVE', '200/201 Created', res.status, passed);

  // TC-DIST-08 [POS]: Update distributor supplier profile
  res = await request(`/distributors/${distributorId}`, {
    method: 'PUT',
    body: {
      name: `Kohler Direct Supplies ${ts} Enterprise`,
      contactPerson: 'Arun Verma',
      phoneNumber: `965432${ts}`,
      email: `supplies.${ts}@kohler-vendor.in`
    }
  }, token);
  passed = res.status === 200 && res.data.name.includes('Enterprise');
  record('TC-DIST-08', 'Distributors', 'Update distributor profile details', 'POSITIVE', '200 OK with updated name', res.status, passed);

  // --- NEGATIVE DISTRIBUTOR TESTS ---
  // TC-DIST-09 [NEG]: Missing required phoneNumber rejection
  res = await request('/distributors', {
    method: 'POST',
    body: { name: 'Supplier Without Phone' }
  }, token);
  record('TC-DIST-09', 'Distributors', 'Missing required phone number rejection', 'NEGATIVE', '400/409', res.status, res.status === 400 || res.status === 409);

  // TC-DIST-10 [NEG]: Get non-existent distributor ID
  res = await request('/distributors/999999', {}, token);
  record('TC-DIST-10', 'Distributors', 'Get non-existent distributor ID', 'NEGATIVE', '404 Not Found', res.status, res.status === 404);

  // TC-DIST-11 [NEG]: Purchase Order with missing distributor ID
  res = await request('/purchase-orders', {
    method: 'POST',
    body: { orderDate: today, items: [{ productId, quantity: 1, unitCost: 1000 }] }
  }, token);
  record('TC-DIST-11', 'Distributors', 'PO with missing distributor ID rejection', 'NEGATIVE', '400/404', res.status, res.status === 400 || res.status === 404);

  // TC-DIST-12 [NEG]: Receiving empty PO without items rejection
  const emptyPoRes = await request('/purchase-orders', {
    method: 'POST',
    body: { distributorId, orderDate: today, status: 'DRAFT', items: [] }
  }, token);
  const emptyPoId = emptyPoRes.data?.id;
  res = await request(`/purchase-orders/${emptyPoId}/status?status=RECEIVED`, { method: 'PATCH' }, token);
  record('TC-DIST-12', 'Distributors', 'Receiving empty PO rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-DIST-13 [NEG]: Purchase Order with negative item quantity
  res = await request('/purchase-orders', {
    method: 'POST',
    body: { distributorId, orderDate: today, items: [{ productId, quantity: -10, unitCost: 1000 }] }
  }, token);
  record('TC-DIST-13', 'Distributors', 'PO with negative quantity rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-DIST-14 [NEG]: Negative distributor payment amount
  res = await request('/distributor-payments', {
    method: 'POST',
    body: { distributorId, amount: -1000.0, paymentMethod: 'CASH', paymentDate: today }
  }, token);
  record('TC-DIST-14', 'Distributors', 'Negative distributor payment rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-DIST-15 [NEG]: Payment to non-existent distributor ID
  res = await request('/distributor-payments', {
    method: 'POST',
    body: { distributorId: 999999, amount: 1000.0, paymentMethod: 'CASH', paymentDate: today }
  }, token);
  record('TC-DIST-15', 'Distributors', 'Payment to non-existent distributor rejection', 'NEGATIVE', '400/404', res.status, res.status === 400 || res.status === 404);

  // ========================================================================
  // SUITE 5: DASHBOARD & REPORTING (10 CASES: 6 POS, 4 NEG)
  // ========================================================================
  console.log('\n--- Suite 5: Dashboard & Analytics (10 Cases) ---');

  // TC-DASH-01 [POS]: Executive KPI Dashboard metrics
  res = await request('/dashboard/stats', {}, token);
  passed = res.status === 200 && res.data !== null;
  record('TC-DASH-01', 'Analytics', 'Get Executive KPI Dashboard statistics', 'POSITIVE', '200 OK with KPIs', res.status, passed);

  // TC-DASH-02 [POS]: Sales Summary Report
  res = await request(`/reports/sales-summary?startDate=2026-01-01&endDate=2026-12-31`, {}, token);
  passed = res.status === 200 && res.data.totalSales !== undefined;
  record('TC-DASH-02', 'Analytics', 'Sales summary report generation', 'POSITIVE', '200 OK with summary', res.status, passed);

  // TC-DASH-03 [POS]: Customer Outstanding Report
  res = await request('/reports/customer-outstanding', {}, token);
  passed = res.status === 200 && res.data !== null;
  record('TC-DASH-03', 'Analytics', 'Customer outstanding accounts receivable report', 'POSITIVE', '200 OK', res.status, passed);

  // TC-DASH-04 [POS]: Distributor Outstanding Report
  res = await request('/reports/distributor-outstanding', {}, token);
  passed = res.status === 200 && res.data !== null;
  record('TC-DASH-04', 'Analytics', 'Distributor outstanding payables report', 'POSITIVE', '200 OK', res.status, passed);

  // TC-DASH-05 [POS]: Inventory Summary Report
  res = await request('/reports/inventory-summary', {}, token);
  passed = res.status === 200 && res.data !== null;
  record('TC-DASH-05', 'Analytics', 'Inventory summary report', 'POSITIVE', '200 OK', res.status, passed);

  // TC-DASH-06 [POS]: System Security Audit Logs Ledger
  res = await request('/audit-logs?page=0&size=20', {}, token);
  passed = res.status === 200 && (res.data.content || res.data).length > 0;
  record('TC-DASH-06', 'Analytics', 'System audit logs security ledger', 'POSITIVE', '200 OK with entries', res.status, passed);

  // --- NEGATIVE DASHBOARD / REPORT TESTS ---
  // TC-DASH-07 [NEG]: Sales summary with malformed date format rejection
  res = await request('/reports/sales-summary?startDate=invalid-date', {}, token);
  record('TC-DASH-07', 'Analytics', 'Sales summary malformed start date rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-DASH-08 [NEG]: Sales summary with invalid order status enum rejection
  res = await request('/reports/sales-summary?status=INVALID_STATUS_ENUM', {}, token);
  record('TC-DASH-08', 'Analytics', 'Sales summary invalid order status enum rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-DASH-09 [NEG]: Customer outstanding invalid customer ID rejection
  res = await request('/reports/customer-outstanding?customerId=invalid_id', {}, token);
  record('TC-DASH-09', 'Analytics', 'Malformed customerId type parameter rejection', 'NEGATIVE', '400 Bad Request', res.status, res.status === 400);

  // TC-DASH-10 [NEG]: Non-existent report type endpoint
  res = await request('/reports/non-existent-report-type', {}, token);
  record('TC-DASH-10', 'Analytics', 'Non-existent report type endpoint', 'NEGATIVE', '404 Not Found', res.status, res.status === 404);

  // ========================================================================
  // SUITE 6: CATALOG PDF BULK IMPORT & PARSING (15 CASES: 8 POS, 7 NEG)
  // ========================================================================
  console.log('\n--- Suite 6: Catalog PDF Bulk Import & Parsing (15 Cases) ---');

  // Load generated PDF test fixtures
  const validPdfBytes = fs.readFileSync('valid_sanitaryware_catalog.pdf');
  const invalidPdfBytes = fs.readFileSync('invalid_pricing_catalog.pdf');

  // Create dedicated brand for bulk catalog upload to guarantee CREATE actions
  const pdfBrandRes = await request('/brands', {
    method: 'POST',
    body: { name: `Catalog Brand ${ts}` }
  }, token);
  const pdfBrandId = pdfBrandRes.data.id;

  // TC-PDF-01 [POS]: Preview valid sanitaryware PDF catalog
  let form = new FormData();
  form.append('brandId', String(pdfBrandId));
  form.append('file', new Blob([validPdfBytes], { type: 'application/pdf' }), 'valid_sanitaryware_catalog.pdf');

  let previewRes = await fetch(`${API_URL}/products/bulk-catalog-preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  let previewData = await previewRes.json();
  passed = previewRes.status === 200 && previewData.importAllowed === true;
  record('TC-PDF-01', 'Catalog PDF', 'Upload & preview valid sanitaryware PDF catalog', 'POSITIVE', '200 OK (importAllowed=true)', previewRes.status, passed);

  // TC-PDF-02 [POS]: Extracted SKU verification
  const skus = previewData.items?.map(i => i.sku);
  passed = skus?.some(s => s.startsWith('E8306')) && skus?.some(s => s.startsWith('T9830')) && skus?.some(s => s.startsWith('K1020'));
  record('TC-PDF-02', 'Catalog PDF', 'Extracted product SKUs from PDF text stream', 'POSITIVE', 'E8306..., T9830..., K1020...', skus?.join(', '), passed);

  // TC-PDF-03 [POS]: Extracted HSN Code verification (691010, 741820)
  const hsns = previewData.items?.map(i => i.hsnCode);
  passed = hsns?.includes('691010') && hsns?.includes('741820');
  record('TC-PDF-03', 'Catalog PDF', 'Extracted HSN Codes from PDF', 'POSITIVE', '691010, 741820', hsns?.join(', '), passed);

  // TC-PDF-04 [POS]: Extracted Product Name verification
  const itemNames = previewData.items?.map(i => i.name);
  passed = itemNames?.some(n => n.includes('Seat Cover')) && itemNames?.some(n => n.includes('Ceramic Basin'));
  record('TC-PDF-04', 'Catalog PDF', 'Extracted Product Names from PDF', 'POSITIVE', 'Matched names', itemNames?.[0], passed);

  // TC-PDF-05 [POS]: Extracted Proposed MRP verification (6650, 2500, 14800)
  const mrps = previewData.items?.map(i => i.proposedMrp);
  passed = mrps?.includes(6650) && mrps?.includes(2500) && mrps?.includes(14800);
  record('TC-PDF-05', 'Catalog PDF', 'Extracted proposed MRP pricing', 'POSITIVE', '6650, 2500, 14800', mrps?.join(', '), passed);

  // TC-PDF-06 [POS]: Extracted Material & Codes (Ceramic / MC12 / IT12)
  const item1 = previewData.items?.find(i => i.sku.startsWith('E8306'));
  passed = item1?.material === 'Ceramic' && item1?.materialCode === 'MC12' && item1?.itemCode === 'IT12';
  record('TC-PDF-06', 'Catalog PDF', 'Extracted Material & Spec codes', 'POSITIVE', 'Ceramic/MC12/IT12', `${item1?.material}/${item1?.materialCode}/${item1?.itemCode}`, passed);

  // TC-PDF-07 [POS]: Action detection (all 3 should be CREATE for new brand)
  const actions = previewData.items?.map(i => i.action);
  passed = actions?.every(a => a === 'CREATE');
  record('TC-PDF-07', 'Catalog PDF', 'Action detection classifies new items as CREATE', 'POSITIVE', 'All CREATE', actions?.join(', '), passed);

  // TC-PDF-08 [POS]: Confirm and commit bulk catalog upload to database
  form = new FormData();
  form.append('brandId', String(pdfBrandId));
  form.append('file', new Blob([validPdfBytes], { type: 'application/pdf' }), 'valid_sanitaryware_catalog.pdf');
  form.append('previewSha256', previewData.sha256);
  form.append('confirmed', 'true');

  let uploadRes = await fetch(`${API_URL}/products/bulk-catalog-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  let uploadData = await uploadRes.json();
  passed = uploadRes.status === 200 && uploadData.createdCount === 3;
  record('TC-PDF-08', 'Catalog PDF', 'Confirm and commit catalog import into database (3 created)', 'POSITIVE', '200 OK (createdCount=3)', `Created: ${uploadData.createdCount}`, passed);

  // --- NEGATIVE CATALOG PDF TESTS ---
  // TC-PDF-09 [NEG]: Unconfirmed import submission (confirmed=false)
  form = new FormData();
  form.append('brandId', String(pdfBrandId));
  form.append('file', new Blob([validPdfBytes], { type: 'application/pdf' }), 'valid_sanitaryware_catalog.pdf');
  form.append('previewSha256', previewData.sha256);
  form.append('confirmed', 'false');

  let unconfRes = await fetch(`${API_URL}/products/bulk-catalog-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  record('TC-PDF-09', 'Catalog PDF', 'Unconfirmed catalog import attempt rejection', 'NEGATIVE', '428 Precondition Required', unconfRes.status, unconfRes.status === 428);

  // TC-PDF-10 [NEG]: Upload with missing SHA256 review token
  form = new FormData();
  form.append('brandId', String(pdfBrandId));
  form.append('file', new Blob([validPdfBytes], { type: 'application/pdf' }), 'valid_sanitaryware_catalog.pdf');
  form.append('confirmed', 'true');

  let noShaRes = await fetch(`${API_URL}/products/bulk-catalog-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  record('TC-PDF-10', 'Catalog PDF', 'Missing SHA256 review token rejection', 'NEGATIVE', '400 Bad Request', noShaRes.status, noShaRes.status === 400 || noShaRes.status === 428);

  // TC-PDF-11 [NEG]: Mismatched / altered SHA256 token
  form = new FormData();
  form.append('brandId', String(pdfBrandId));
  form.append('file', new Blob([validPdfBytes], { type: 'application/pdf' }), 'valid_sanitaryware_catalog.pdf');
  form.append('previewSha256', '0000000000000000000000000000000000000000000000000000000000000000');
  form.append('confirmed', 'true');

  let badShaRes = await fetch(`${API_URL}/products/bulk-catalog-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  record('TC-PDF-11', 'Catalog PDF', 'Mismatched SHA256 tamper rejection', 'NEGATIVE', '409 Conflict', badShaRes.status, badShaRes.status === 409);

  // TC-PDF-12 [NEG]: Preview corrupt / invalid pricing catalog
  form = new FormData();
  form.append('brandId', String(pdfBrandId));
  form.append('file', new Blob([invalidPdfBytes], { type: 'application/pdf' }), 'invalid_pricing_catalog.pdf');

  let badPriceRes = await fetch(`${API_URL}/products/bulk-catalog-preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  let badPriceData = await badPriceRes.json();
  passed = badPriceRes.status === 200 && badPriceData.importAllowed === false;
  record('TC-PDF-12', 'Catalog PDF', 'Corrupt/Unparseable pricing PDF blocks import (importAllowed=false)', 'NEGATIVE', 'importAllowed=false', `Allowed: ${badPriceData.importAllowed}`, passed);

  // TC-PDF-13 [NEG]: Non-PDF file upload (e.g., text/plain)
  form = new FormData();
  form.append('brandId', String(pdfBrandId));
  form.append('file', new Blob(['This is not a PDF'], { type: 'text/plain' }), 'text.txt');

  let notPdfRes = await fetch(`${API_URL}/products/bulk-catalog-preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  record('TC-PDF-13', 'Catalog PDF', 'Non-PDF file type rejection', 'NEGATIVE', '415 Unsupported Media Type / 400', notPdfRes.status, notPdfRes.status === 415 || notPdfRes.status === 400);

  // TC-PDF-14 [NEG]: Missing brandId parameter
  form = new FormData();
  form.append('file', new Blob([validPdfBytes], { type: 'application/pdf' }), 'valid_sanitaryware_catalog.pdf');

  let noBrandRes = await fetch(`${API_URL}/products/bulk-catalog-preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  record('TC-PDF-14', 'Catalog PDF', 'Missing brandId parameter rejection', 'NEGATIVE', '400 Bad Request', noBrandRes.status, noBrandRes.status === 400);

  // TC-PDF-15 [NEG]: Non-existent brandId parameter (999999)
  form = new FormData();
  form.append('brandId', '999999');
  form.append('file', new Blob([validPdfBytes], { type: 'application/pdf' }), 'valid_sanitaryware_catalog.pdf');

  let fakeBrandRes = await fetch(`${API_URL}/products/bulk-catalog-preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  record('TC-PDF-15', 'Catalog PDF', 'Non-existent brandId rejection', 'NEGATIVE', '400/404', fakeBrandRes.status, fakeBrandRes.status === 400 || fakeBrandRes.status === 404);

  console.log('\n========================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`100-Case Full Audit Complete: ${passedCount} / ${results.length} PASSED`);
  console.log('========================================================================');

  // Save report JSON
  fs.writeFileSync('docs/100-cases-audit-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalCases: results.length,
    passedCount,
    failedCount: results.length - passedCount,
    passRate: `${((passedCount / results.length) * 100).toFixed(1)}%`,
    results
  }, null, 2));

  console.log('Results persisted to docs/100-cases-audit-results.json');
}

runAudit().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
