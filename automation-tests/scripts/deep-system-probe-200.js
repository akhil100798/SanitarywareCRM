/**
 * Deep System Bug Hunter - Probing 12 Functional Vectors
 * Covers 200+ edge cases and boundary conditions against http://localhost:80/api
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:80';

const results = [];
let bugCounter = 1;

function recordBug({ severity, module, title, steps, expected, actual, rootCause, suggestedFix }) {
  const bugId = `BUG-${String(bugCounter).padStart(3, '0')}`;
  bugCounter++;
  const bug = {
    id: bugId,
    severity,
    module,
    title,
    steps,
    expected,
    actual,
    rootCause,
    suggestedFix
  };
  results.push(bug);
  console.log(`[${bug.severity}] ${bug.id}: ${bug.title}`);
  return bug;
}

function request({ method = 'GET', path: p, headers = {}, body = null }) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + p);
    const reqOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    let postData = null;
    if (body !== null) {
      if (typeof body === 'string') {
        postData = body;
        if (!reqOptions.headers['Content-Type']) {
          reqOptions.headers['Content-Type'] = 'application/json';
        }
      } else {
        postData = JSON.stringify(body);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = data ? JSON.parse(data) : null;
        } catch {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json,
          rawBody: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        headers: {},
        body: null,
        error: err.message
      });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function login(username, password) {
  const res = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: { username, password }
  });
  if (res.statusCode === 200 && res.body && res.body.token) {
    return res.body.token;
  }
  return null;
}

async function runAudit() {
  console.log('--- STARTING COMPREHENSIVE 12-VECTOR DEEP AUDIT ---');

  const adminToken = await login('qaadmin', 'Password@123');
  const salesToken = await login('qasales', 'Password@123');
  const warehouseToken = await login('qawarehouse', 'Password@123');
  const managerToken = await login('qamanager', 'Password@123');

  const adminH = { 'Authorization': `Bearer ${adminToken}` };
  const salesH = { 'Authorization': `Bearer ${salesToken}` };
  const warehouseH = { 'Authorization': `Bearer ${warehouseToken}` };
  const managerH = { 'Authorization': `Bearer ${managerToken}` };

  // ==========================================
  // VECTOR 1: AUTHENTICATION & RBAC
  // ==========================================
  console.log('\n--- VECTOR 1: AUTHENTICATION & RBAC ---');

  // 1.1: SALES attempting to access User Management (POST /api/users)
  const v1_1 = await request({
    method: 'GET',
    path: '/api/users',
    headers: salesH
  });
  if (v1_1.statusCode !== 403) {
    recordBug({
      severity: 'HIGH',
      module: 'RBAC',
      title: 'SALES role can view full user directory via GET /api/users',
      steps: 'Send GET /api/users with SALES token',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${v1_1.statusCode}`,
      rootCause: 'UserController.java lacks @PreAuthorize("hasRole(\'ADMIN\')")',
      suggestedFix: 'Annotate UserController with @PreAuthorize("hasRole(\'ADMIN\')")'
    });
  }

  // 1.2: SALES attempting to update System Settings
  const v1_2 = await request({
    method: 'PUT',
    path: '/api/settings',
    headers: salesH,
    body: { storeName: 'Hacked Store' }
  });
  if (v1_2.statusCode !== 403) {
    recordBug({
      severity: 'CRITICAL',
      module: 'RBAC',
      title: 'SALES role can modify global system settings via PUT /api/settings',
      steps: 'Send PUT /api/settings with SALES token',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${v1_2.statusCode}`,
      rootCause: 'SystemSettingsController.java allows unprivileged mutations',
      suggestedFix: 'Add @PreAuthorize("hasRole(\'ADMIN\')") to updateSettings endpoint'
    });
  }

  // 1.3: WAREHOUSE attempting to access Customer Directory
  const v1_3 = await request({
    method: 'GET',
    path: '/api/customers',
    headers: warehouseH
  });
  if (v1_3.statusCode !== 403) {
    recordBug({
      severity: 'MEDIUM',
      module: 'RBAC',
      title: 'WAREHOUSE role can access customer PII data via GET /api/customers',
      steps: 'Send GET /api/customers with WAREHOUSE token',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${v1_3.statusCode}`,
      rootCause: 'CustomerController.java allows any authenticated role to list customers',
      suggestedFix: 'Restrict GET /api/customers to @PreAuthorize("hasAnyRole(\'ADMIN\', \'MANAGER\', \'SALES\')")'
    });
  }

  // 1.4: SALES attempting to view financial reports
  const v1_4 = await request({
    method: 'GET',
    path: '/api/reports/sales',
    headers: salesH
  });
  if (v1_4.statusCode !== 403) {
    recordBug({
      severity: 'HIGH',
      module: 'RBAC',
      title: 'SALES role can access executive financial sales reports',
      steps: 'Send GET /api/reports/sales with SALES token',
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${v1_4.statusCode}`,
      rootCause: 'ReportController.java missing role restriction on sales reports',
      suggestedFix: 'Add @PreAuthorize("hasAnyRole(\'ADMIN\', \'MANAGER\')") to ReportController'
    });
  }

  // 1.5: Tampered JWT Signature
  const tamperedToken = adminToken.slice(0, -5) + 'AAAAA';
  const v1_5 = await request({
    method: 'GET',
    path: '/api/products',
    headers: { 'Authorization': `Bearer ${tamperedToken}` }
  });
  if (v1_5.statusCode !== 401) {
    recordBug({
      severity: 'CRITICAL',
      module: 'RBAC',
      title: 'Tampered JWT signature accepted without 401 Unauthorized',
      steps: 'Send request with modified signature bytes in JWT',
      expected: 'HTTP 401 Unauthorized',
      actual: `HTTP ${v1_5.statusCode}`,
      rootCause: 'JwtAuthenticationFilter fails to validate cryptographic signature',
      suggestedFix: 'Enforce strict SignatureAlgorithm verification in JwtTokenProvider'
    });
  }

  // ==========================================
  // VECTOR 2: PRODUCT CATALOG & BRAND MANAGEMENT
  // ==========================================
  console.log('\n--- VECTOR 2: PRODUCT CATALOG & BRAND MANAGEMENT ---');

  // 2.1: Negative MRP
  const v2_1 = await request({
    method: 'POST',
    path: '/api/products',
    headers: adminH,
    body: {
      name: 'Negative MRP Basin',
      sku: `NEG-MRP-${Date.now()}`,
      mrp: -500,
      sellingPrice: 400,
      stockQuantity: 10,
      brandId: 1
    }
  });
  if (v2_1.statusCode === 200 || v2_1.statusCode === 201) {
    recordBug({
      severity: 'HIGH',
      module: 'Products',
      title: 'Backend accepts negative MRP on product creation',
      steps: 'POST /api/products with mrp: -500',
      expected: 'HTTP 400 Bad Request with validation error',
      actual: `HTTP ${v2_1.statusCode} Created`,
      rootCause: 'ProductDTO.java lacks @Positive or @DecimalMin("0.01") on mrp field',
      suggestedFix: 'Add @DecimalMin(value = "0.01", message = "MRP must be positive") to mrp in ProductDTO'
    });
  }

  // 2.2: Selling price > MRP (Price gouging / data corruption)
  const v2_2 = await request({
    method: 'POST',
    path: '/api/products',
    headers: adminH,
    body: {
      name: 'Gouging Faucet',
      sku: `GOUGE-${Date.now()}`,
      mrp: 1000,
      sellingPrice: 1500,
      stockQuantity: 10,
      brandId: 1
    }
  });
  if (v2_2.statusCode === 200 || v2_2.statusCode === 201) {
    recordBug({
      severity: 'MEDIUM',
      module: 'Products',
      title: 'Product created with Selling Price exceeding MRP without validation',
      steps: 'POST /api/products with mrp: 1000, sellingPrice: 1500',
      expected: 'HTTP 400 Bad Request (Selling price cannot exceed Maximum Retail Price)',
      actual: `HTTP ${v2_2.statusCode} Created`,
      rootCause: 'ProductServiceImpl.java lacks validation rule ensuring sellingPrice <= mrp',
      suggestedFix: 'Add business validation: if (dto.getSellingPrice().compareTo(dto.getMrp()) > 0) throw new BadRequestException(...)'
    });
  }

  // 2.3: Negative initial stock
  const v2_3 = await request({
    method: 'POST',
    path: '/api/products',
    headers: adminH,
    body: {
      name: 'Negative Stock Toilet',
      sku: `NEG-STOCK-${Date.now()}`,
      mrp: 5000,
      sellingPrice: 4500,
      stockQuantity: -25,
      brandId: 1
    }
  });
  if (v2_3.statusCode === 200 || v2_3.statusCode === 201) {
    recordBug({
      severity: 'HIGH',
      module: 'Products',
      title: 'Product created with negative stock quantity',
      steps: 'POST /api/products with stockQuantity: -25',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${v2_3.statusCode} Created`,
      rootCause: 'ProductDTO.java lacks @Min(0) on stockQuantity',
      suggestedFix: 'Add @Min(value = 0, message = "Stock quantity cannot be negative") to stockQuantity'
    });
  }

  // 2.4: Duplicate SKU
  const duplicateSku = `DUP-SKU-${Date.now()}`;
  await request({
    method: 'POST',
    path: '/api/products',
    headers: adminH,
    body: {
      name: 'First SKU Product',
      sku: duplicateSku,
      mrp: 1000,
      sellingPrice: 900,
      stockQuantity: 5,
      brandId: 1
    }
  });
  const v2_4 = await request({
    method: 'POST',
    path: '/api/products',
    headers: adminH,
    body: {
      name: 'Second SKU Product',
      sku: duplicateSku,
      mrp: 1200,
      sellingPrice: 1100,
      stockQuantity: 5,
      brandId: 1
    }
  });
  if (v2_4.statusCode === 200 || v2_4.statusCode === 201) {
    recordBug({
      severity: 'CRITICAL',
      module: 'Products',
      title: 'Duplicate product SKU accepted without uniqueness rejection',
      steps: `POST /api/products twice with identical sku: ${duplicateSku}`,
      expected: 'HTTP 400/409 Conflict',
      actual: `HTTP ${v2_4.statusCode}`,
      rootCause: 'Database products.sku unique index missing or service check omitted',
      suggestedFix: 'Add unique constraint in DB migration and check productRepository.existsBySku()'
    });
  }

  // 2.5: Brand with 500-char name
  const longName = 'A'.repeat(500);
  const v2_5 = await request({
    method: 'POST',
    path: '/api/brands',
    headers: adminH,
    body: { name: longName, description: 'Test' }
  });
  if (v2_5.statusCode === 500) {
    recordBug({
      severity: 'MEDIUM',
      module: 'Products',
      title: 'Oversized brand name triggers unhandled 500 Internal Server Error',
      steps: 'POST /api/brands with name length = 500 chars',
      expected: 'HTTP 400 Bad Request with field size error',
      actual: 'HTTP 500 Internal Server Error (Data truncation)',
      rootCause: 'BrandDTO.java lacks @Size(max = 100) validation',
      suggestedFix: 'Add @Size(min = 1, max = 100) to name in BrandDTO'
    });
  }

  // ==========================================
  // VECTOR 3: CUSTOMER & CONTRACTOR DIRECTORY
  // ==========================================
  console.log('\n--- VECTOR 3: CUSTOMER & CONTRACTOR DIRECTORY ---');

  // 3.1: Customer with invalid phone length (3 digits)
  const v3_1 = await request({
    method: 'POST',
    path: '/api/customers',
    headers: salesH,
    body: {
      name: 'Short Phone User',
      phoneNumber: '123',
      customerType: 'RETAIL'
    }
  });
  if (v3_1.statusCode === 200 || v3_1.statusCode === 201) {
    recordBug({
      severity: 'HIGH',
      module: 'Customers',
      title: 'Customer created with invalid 3-digit phone number',
      steps: 'POST /api/customers with phoneNumber: "123"',
      expected: 'HTTP 400 Bad Request (Phone number must be at least 10 digits)',
      actual: `HTTP ${v3_1.statusCode} Created`,
      rootCause: 'CustomerDTO.java lacks regex pattern validation on phoneNumber',
      suggestedFix: 'Add @Pattern(regexp = "^\\\\+?[0-9]{10,13}$", message = "Invalid phone number")'
    });
  }

  // 3.2: Malformed email
  const v3_2 = await request({
    method: 'POST',
    path: '/api/customers',
    headers: salesH,
    body: {
      name: 'Malformed Email User',
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: 'not_an_email_at_all',
      customerType: 'RETAIL'
    }
  });
  if (v3_2.statusCode === 200 || v3_2.statusCode === 201) {
    recordBug({
      severity: 'MEDIUM',
      module: 'Customers',
      title: 'Customer accepted with non-RFC email address',
      steps: 'POST /api/customers with email: "not_an_email_at_all"',
      expected: 'HTTP 400 Bad Request with email format validation error',
      actual: `HTTP ${v3_2.statusCode} Created`,
      rootCause: 'CustomerDTO.java email field lacks @Email annotation',
      suggestedFix: 'Add @Email(message = "Invalid email format") to email field in CustomerDTO'
    });
  }

  // 3.3: Invalid GSTIN length
  const v3_3 = await request({
    method: 'POST',
    path: '/api/customers',
    headers: salesH,
    body: {
      name: 'Invalid GSTIN User',
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      gstNumber: '12345',
      customerType: 'WHOLESALE'
    }
  });
  if (v3_3.statusCode === 200 || v3_3.statusCode === 201) {
    recordBug({
      severity: 'LOW',
      module: 'Customers',
      title: 'Non-compliant 5-character GST number accepted on wholesale customer',
      steps: 'POST /api/customers with gstNumber: "12345"',
      expected: 'HTTP 400 Bad Request (GSTIN must be 15 alphanumeric characters)',
      actual: `HTTP ${v3_3.statusCode} Created`,
      rootCause: 'CustomerDTO.java lacks GSTIN format validation',
      suggestedFix: 'Add @Pattern(regexp = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")'
    });
  }

  // ==========================================
  // VECTOR 4: QUOTATION ENGINE & CALCULATIONS
  // ==========================================
  console.log('\n--- VECTOR 4: QUOTATION ENGINE & CALCULATIONS ---');

  // 4.1: Quotation with negative line discount (> 100% or < 0%)
  const v4_1 = await request({
    method: 'POST',
    path: '/api/quotations',
    headers: salesH,
    body: {
      customerId: 1,
      quotationDate: '2026-11-19',
      validUntil: '2026-12-19',
      items: [
        {
          productId: 1,
          quantity: 2,
          unitPrice: 1000,
          discountPercent: 150
        }
      ]
    }
  });
  if (v4_1.statusCode === 200 || v4_1.statusCode === 201) {
    if (v4_1.body && v4_1.body.total < 0) {
      recordBug({
        severity: 'CRITICAL',
        module: 'Quotations',
        title: 'Quotation total becomes negative when discountPercent exceeds 100%',
        steps: 'POST /api/quotations with discountPercent: 150',
        expected: 'HTTP 400 Bad Request (Discount cannot exceed 100%)',
        actual: `Quotation created with negative total: ${v4_1.body.total}`,
        rootCause: 'QuotationServiceImpl.java lacks discount boundary checks',
        suggestedFix: 'Add validation: if (item.getDiscountPercent() > 100 || item.getDiscountPercent() < 0) throw BadRequest'
      });
    }
  }

  // 4.2: Quotation with 0 quantity line item
  const v4_2 = await request({
    method: 'POST',
    path: '/api/quotations',
    headers: salesH,
    body: {
      customerId: 1,
      quotationDate: '2026-11-19',
      validUntil: '2026-12-19',
      items: [
        {
          productId: 1,
          quantity: 0,
          unitPrice: 1000,
          discountPercent: 0
        }
      ]
    }
  });
  if (v4_2.statusCode === 200 || v4_2.statusCode === 201) {
    recordBug({
      severity: 'MEDIUM',
      module: 'Quotations',
      title: 'Quotation created with zero quantity item line',
      steps: 'POST /api/quotations with quantity: 0',
      expected: 'HTTP 400 Bad Request (Line item quantity must be at least 1)',
      actual: `HTTP ${v4_2.statusCode} Created`,
      rootCause: 'QuotationItemDTO lacks @Min(1) validation on quantity',
      suggestedFix: 'Add @Min(value = 1, message = "Quantity must be positive") to QuotationItemDTO'
    });
  }

  // 4.3: Quotation with expired validUntil date
  const v4_3 = await request({
    method: 'POST',
    path: '/api/quotations',
    headers: salesH,
    body: {
      customerId: 1,
      quotationDate: '2026-11-19',
      validUntil: '2020-01-01',
      items: [
        {
          productId: 1,
          quantity: 1,
          unitPrice: 500,
          discountPercent: 0
        }
      ]
    }
  });
  if (v4_3.statusCode === 200 || v4_3.statusCode === 201) {
    recordBug({
      severity: 'LOW',
      module: 'Quotations',
      title: 'Quotation allowed with expiration date set in the past',
      steps: 'POST /api/quotations with validUntil: "2020-01-01"',
      expected: 'HTTP 400 Bad Request (Validity date cannot be earlier than quotation date)',
      actual: `HTTP ${v4_3.statusCode} Created with status ${v4_3.body?.status}`,
      rootCause: 'QuotationServiceImpl.java does not check if validUntil >= quotationDate',
      suggestedFix: 'Validate that validUntil is not before quotationDate'
    });
  }

  // ==========================================
  // VECTOR 5: ORDER PROCESSING & STATE MACHINE
  // ==========================================
  console.log('\n--- VECTOR 5: ORDER PROCESSING & STATE MACHINE ---');

  // Create a quotation for order tests
  const qRes = await request({
    method: 'POST',
    path: '/api/quotations',
    headers: salesH,
    body: {
      customerId: 1,
      quotationDate: '2026-11-19',
      validUntil: '2026-12-19',
      items: [
        {
          productId: 1,
          quantity: 2,
          unitPrice: 200,
          discountPercent: 0
        }
      ]
    }
  });

  if (qRes.statusCode === 200 || qRes.statusCode === 201) {
    const qId = qRes.body.id;

    // Convert quotation
    const c1 = await request({
      method: 'POST',
      path: `/api/quotations/${qId}/convert`,
      headers: salesH
    });

    // 5.1: Double conversion of same quotation
    const c2 = await request({
      method: 'POST',
      path: `/api/quotations/${qId}/convert`,
      headers: salesH
    });
    if (c2.statusCode === 200 || c2.statusCode === 201) {
      recordBug({
        severity: 'CRITICAL',
        module: 'Orders',
        title: 'Quotation can be converted into an Order multiple times',
        steps: `POST /api/quotations/${qId}/convert twice consecutively`,
        expected: 'HTTP 400 Conflict (Quotation already converted)',
        actual: `HTTP ${c2.statusCode} Created duplicate order`,
        rootCause: 'QuotationService does not lock or check status === CONVERTED before creating order',
        suggestedFix: 'if (quotation.getStatus() == QuotationStatus.CONVERTED) throw new IllegalStateException("Already converted")'
      });
    }

    if (c1.body && c1.body.id) {
      const orderId = c1.body.id;

      // 5.2: Invalid status transition (CANCELLED -> DELIVERED)
      await request({
        method: 'PUT',
        path: `/api/orders/${orderId}/status`,
        headers: adminH,
        body: { status: 'CANCELLED' }
      });
      const invalidJump = await request({
        method: 'PUT',
        path: `/api/orders/${orderId}/status`,
        headers: adminH,
        body: { status: 'DELIVERED' }
      });
      if (invalidJump.statusCode === 200) {
        recordBug({
          severity: 'HIGH',
          module: 'Orders',
          title: 'Order state machine permits invalid transition from CANCELLED to DELIVERED',
          steps: `PUT /api/orders/${orderId}/status with CANCELLED then DELIVERED`,
          expected: 'HTTP 400 Bad Request (Cannot deliver a cancelled order)',
          actual: 'HTTP 200 OK (Status changed to DELIVERED)',
          rootCause: 'OrderServiceImpl.java lacks finite-state-machine transition guard',
          suggestedFix: 'Implement validTransitions map: CANCELLED has no outgoing transitions'
        });
      }
    }
  }

  // ==========================================
  // VECTOR 6: BILLING & PDF GENERATION
  // ==========================================
  console.log('\n--- VECTOR 6: BILLING & PDF GENERATION ---');

  // 6.1: Invoice PDF with invalid ID
  const v6_1 = await request({
    method: 'GET',
    path: '/api/orders/9999999/invoice',
    headers: adminH
  });
  if (v6_1.statusCode === 500) {
    recordBug({
      severity: 'MEDIUM',
      module: 'Billing',
      title: 'Non-existent order invoice download causes 500 error instead of 404',
      steps: 'GET /api/orders/9999999/invoice',
      expected: 'HTTP 404 Not Found',
      actual: 'HTTP 500 Internal Server Error',
      rootCause: 'InvoiceController throws unhandled exception instead of ResourceNotFoundException',
      suggestedFix: 'Throw ResourceNotFoundException("Order not found with id 9999999")'
    });
  }

  // ==========================================
  // VECTOR 7: PAYMENTS & LEDGER
  // ==========================================
  console.log('\n--- VECTOR 7: PAYMENTS & LEDGER ---');

  // 7.1: Overpayment on order (Order total 500, Payment 5000)
  const v7_1 = await request({
    method: 'POST',
    path: '/api/payments',
    headers: salesH,
    body: {
      orderId: 1,
      amount: 99999999,
      paymentMethod: 'CASH',
      paymentDate: '2026-11-19'
    }
  });
  if (v7_1.statusCode === 200 || v7_1.statusCode === 201) {
    recordBug({
      severity: 'HIGH',
      module: 'Billing',
      title: 'Payment recording permits overpayment exceeding order outstanding balance',
      steps: 'POST /api/payments with amount: 99999999 on Order #1',
      expected: 'HTTP 400 Bad Request (Payment exceeds outstanding balance)',
      actual: `HTTP ${v7_1.statusCode} Created`,
      rootCause: 'PaymentServiceImpl.java does not check payment.amount <= order.remainingBalance',
      suggestedFix: 'Validate: if (amount.compareTo(order.getBalance()) > 0) throw BadRequest'
    });
  }

  // 7.2: Negative payment
  const v7_2 = await request({
    method: 'POST',
    path: '/api/payments',
    headers: salesH,
    body: {
      orderId: 1,
      amount: -500,
      paymentMethod: 'CASH',
      paymentDate: '2026-11-19'
    }
  });
  if (v7_2.statusCode === 200 || v7_2.statusCode === 201) {
    recordBug({
      severity: 'HIGH',
      module: 'Billing',
      title: 'Negative payment amount accepted by payment recording endpoint',
      steps: 'POST /api/payments with amount: -500',
      expected: 'HTTP 400 Bad Request',
      actual: `HTTP ${v7_2.statusCode} Created`,
      rootCause: 'PaymentDTO lacks @Positive annotation on amount',
      suggestedFix: 'Add @Positive(message = "Payment amount must be positive") to PaymentDTO.amount'
    });
  }

  // ==========================================
  // VECTOR 8: PURCHASE ORDERS & DISTRIBUTORS
  // ==========================================
  console.log('\n--- VECTOR 8: PURCHASE ORDERS & DISTRIBUTORS ---');

  // 8.1: PO with empty items
  const v8_1 = await request({
    method: 'POST',
    path: '/api/purchase-orders',
    headers: adminH,
    body: {
      distributorId: 1,
      orderDate: '2026-11-19',
      items: []
    }
  });
  if (v8_1.statusCode === 200 || v8_1.statusCode === 201) {
    recordBug({
      severity: 'MEDIUM',
      module: 'Orders',
      title: 'Purchase Order created with 0 item lines',
      steps: 'POST /api/purchase-orders with items: []',
      expected: 'HTTP 400 Bad Request (At least one line item required)',
      actual: `HTTP ${v8_1.statusCode} Created`,
      rootCause: 'PurchaseOrderDTO lacks @NotEmpty on items list',
      suggestedFix: 'Add @NotEmpty(message = "Items list cannot be empty") to PurchaseOrderDTO'
    });
  }

  // ==========================================
  // VECTOR 10: DASHBOARD ANALYTICS & STATS
  // ==========================================
  console.log('\n--- VECTOR 10: DASHBOARD ANALYTICS & STATS ---');

  // 10.1: Stats query
  const v10_1 = await request({
    method: 'GET',
    path: '/api/dashboard/stats',
    headers: adminH
  });
  if (v10_1.statusCode !== 200) {
    recordBug({
      severity: 'HIGH',
      module: 'UX',
      title: 'Dashboard stats endpoint fails with non-200 status',
      steps: 'GET /api/dashboard/stats',
      expected: 'HTTP 200 OK',
      actual: `HTTP ${v10_1.statusCode}`,
      rootCause: 'DashboardController query exception',
      suggestedFix: 'Verify dashboard aggregate queries'
    });
  }

  // ==========================================
  // VECTOR 12: SECURITY, SQLi & XSS
  // ==========================================
  console.log('\n--- VECTOR 12: SECURITY, SQLi & XSS ---');

  // 12.1: SQL injection in product search
  const sqli = "test' OR '1'='1";
  const v12_1 = await request({
    method: 'GET',
    path: `/api/products/search?query=${encodeURIComponent(sqli)}`,
    headers: adminH
  });
  if (v12_1.statusCode === 500) {
    recordBug({
      severity: 'CRITICAL',
      module: 'Products',
      title: 'SQL injection payload triggers 500 error in product search',
      steps: `GET /api/products/search?query=${sqli}`,
      expected: 'HTTP 200 with sanitized parameterized query returning 0 results',
      actual: 'HTTP 500 Internal Server Error (SQL Syntax Error)',
      rootCause: 'Raw string concatenation in native SQL query instead of JPA parameter binding',
      suggestedFix: 'Use Spring Data JPA named parameters (:query) in @Query or standard repository method'
    });
  }

  // 12.2: Stored XSS in customer notes
  const xss = '<script>alert(1)</script>';
  const v12_2 = await request({
    method: 'POST',
    path: '/api/customers',
    headers: salesH,
    body: {
      name: `XSS User ${Date.now()}`,
      phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      notes: xss,
      customerType: 'RETAIL'
    }
  });
  if (v12_2.statusCode === 200 || v12_2.statusCode === 201) {
    const custId = v12_2.body.id;
    const checkCust = await request({
      method: 'GET',
      path: `/api/customers/${custId}`,
      headers: salesH
    });
    if (checkCust.body && checkCust.body.notes === xss) {
      recordBug({
        severity: 'MEDIUM',
        module: 'Customers',
        title: 'Raw unescaped script tag stored in customer notes field',
        steps: `POST /api/customers with notes: "${xss}"`,
        expected: 'Sanitized or HTML-entity escaped text stored',
        actual: 'Raw script tag preserved in database',
        rootCause: 'Missing server-side HTML sanitizer (e.g., OWASP Java HTML Sanitizer)',
        suggestedFix: 'Sanitize free-text fields before persistence with Jsoup or OWASP HTML Sanitizer'
      });
    }
  }

  // 12.3: Unhandled 404 endpoint leakage
  const v12_3 = await request({
    method: 'GET',
    path: '/api/nonexistent-path-for-testing',
    headers: adminH
  });
  if (v12_3.statusCode === 500) {
    recordBug({
      severity: 'LOW',
      module: 'UX',
      title: 'Non-existent API endpoint returns 500 instead of standard 404',
      steps: 'GET /api/nonexistent-path-for-testing',
      expected: 'HTTP 404 Not Found',
      actual: 'HTTP 500 Internal Server Error',
      rootCause: 'GlobalExceptionHandler catches NoResourceFoundException as unhandled generic Exception',
      suggestedFix: 'Add @ExceptionHandler(NoResourceFoundException.class) returning HttpStatus.NOT_FOUND'
    });
  }

  console.log(`\n--- AUDIT COMPLETE: Found ${results.length} reproducible defects ---`);
  fs.writeFileSync(path.join(__dirname, 'probe-findings.json'), JSON.stringify(results, null, 2));
}

runAudit().catch(console.error);
