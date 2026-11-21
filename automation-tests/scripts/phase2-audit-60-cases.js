const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:8081/api';

const results = [];

function record(id, category, name, type, expected, actual, passed, details = '') {
  results.push({ id, category, name, type, expected, actual, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${id} [${type}] ${name}`);
  if (!passed) {
    console.log(`   Expected: ${expected} | Actual: ${actual} | Details: ${details}`);
  }
}

async function request(endpoint, options = {}, token = '') {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const config = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  };

  try {
    const res = await fetch(url, config);
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => '');
    }
    return { status: res.status, data };
  } catch (err) {
    return { status: 500, error: err.message, data: null };
  }
}

async function runPhase2Audit() {
  console.log('========================================================================');
  console.log('   PHASE 2: CUSTOMER DIRECTORY & MASTER CATALOG (60 TEST CASES)         ');
  console.log('   30 Positive Cases + 30 Negative Cases                                ');
  console.log('========================================================================\n');

  // 1. Authenticate as Admin
  const authRes = await request('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' }
  });
  if (authRes.status !== 200 || !authRes.data?.token) {
    console.error('Failed to authenticate:', authRes.status, authRes.data);
    process.exit(1);
  }
  const token = authRes.data.token;
  console.log('Authenticated successfully as ADMIN. Token acquired.\n');

  const timestamp = Date.now().toString().slice(-4);

  let testCustomerId = null;
  let testCategoryId = null;
  let testBrandId = null;
  let testProductId = null;
  const uniquePhone = `987654${timestamp}`; // 6 + 4 = 10 digits
  const uniqueSku = `SKU-P2-${timestamp}`;

  // ========================================================================
  // SUB-SUITE 1: CUSTOMER DIRECTORY (24 TEST CASES: 12 POSITIVE, 12 NEGATIVE)
  // ========================================================================
  console.log('--- Sub-suite 1: Customer Directory & Validations ---');

  // TC-CUST-01 [POS]: Create valid Retail customer
  let res = await request('/customers', {
    method: 'POST',
    body: {
      name: `Anita Ceramic House ${timestamp}`,
      email: `anita.${timestamp}@example.com`,
      phoneNumber: uniquePhone,
      customerType: 'RETAIL',
      billingAddress: '42 MG Road, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001'
    }
  }, token);
  let passed = res.status === 201 && !!res.data.id;
  testCustomerId = res.data?.id;
  record('TC-CUST-01', 'Customer', 'Create valid Retail customer with 10-digit phone', 'POSITIVE', '201 Created', res.status, passed, `Created Customer ID: ${testCustomerId}`);

  // TC-CUST-02 [POS]: Create customer with +91 country code formatting
  res = await request('/customers', {
    method: 'POST',
    body: {
      name: `Bhaskar Plumbing ${timestamp}`,
      phoneNumber: `+91 98888 ${timestamp}`,
      customerType: 'WHOLESALE'
    }
  }, token);
  passed = res.status === 201;
  record('TC-CUST-02', 'Customer', 'Create customer with formatted +91 phone number', 'POSITIVE', '201 Created', res.status, passed);

  // TC-CUST-03 [POS]: Create customer with hyphens and spaces in phone
  res = await request('/customers', {
    method: 'POST',
    body: {
      name: `Chandra Builders ${timestamp}`,
      phoneNumber: `977-654-${timestamp}`,
      customerType: 'BUILDER'
    }
  }, token);
  passed = res.status === 201;
  record('TC-CUST-03', 'Customer', 'Create customer with phone containing hyphens', 'POSITIVE', '201 Created', res.status, passed);

  // TC-CUST-04 [POS]: Create customer with valid GSTIN and Company name
  res = await request('/customers', {
    method: 'POST',
    body: {
      name: `Deccan Infra ${timestamp}`,
      company: 'Deccan Infrastructure Pvt Ltd',
      gstNumber: '29ABCDE1234F1Z5',
      phoneNumber: `986541${timestamp}`,
      customerType: 'CONTRACTOR'
    }
  }, token);
  passed = res.status === 201;
  record('TC-CUST-04', 'Customer', 'Create customer with GSTIN and Contractor type', 'POSITIVE', '201 Created', res.status, passed);

  // TC-CUST-05 [POS]: Create customer with BUILDER type
  res = await request('/customers', {
    method: 'POST',
    body: {
      name: `Esha Design Studio ${timestamp}`,
      phoneNumber: `985432${timestamp}`,
      customerType: 'BUILDER'
    }
  }, token);
  passed = res.status === 201;
  record('TC-CUST-05', 'Customer', 'Create customer with BUILDER type', 'POSITIVE', '201 Created', res.status, passed);

  // TC-CUST-06 [POS]: Retrieve customer by ID
  res = await request(`/customers/${testCustomerId}`, {}, token);
  passed = res.status === 200 && res.data.id === testCustomerId;
  record('TC-CUST-06', 'Customer', 'Get customer by ID', 'POSITIVE', '200 OK', res.status, passed, res.data?.name);

  // TC-CUST-07 [POS]: Search customer by partial name query
  res = await request(`/customers/search?query=Anita`, {}, token);
  passed = res.status === 200 && res.data.content && res.data.content.length > 0;
  record('TC-CUST-07', 'Customer', 'Search customer by partial name', 'POSITIVE', '200 OK with content', res.status, passed, `Found: ${res.data.content?.length || 0}`);

  // TC-CUST-08 [POS]: Search customer by phone number
  res = await request(`/customers/search?query=${uniquePhone}`, {}, token);
  passed = res.status === 200 && res.data.content && res.data.content.length > 0;
  record('TC-CUST-08', 'Customer', 'Search customer by phone query', 'POSITIVE', '200 OK with content', res.status, passed);

  // TC-CUST-09 [POS]: Update customer details (address & notes)
  res = await request(`/customers/${testCustomerId}`, {
    method: 'PUT',
    body: {
      name: `Anita Ceramic House ${timestamp} Updated`,
      phoneNumber: uniquePhone,
      billingAddress: 'Suite 500, High Tech Park, Bangalore',
      notes: 'Premium VIP customer'
    }
  }, token);
  passed = res.status === 200 && res.data.notes === 'Premium VIP customer';
  record('TC-CUST-09', 'Customer', 'Update existing customer profile', 'POSITIVE', '200 OK with updated notes', res.status, passed);

  // TC-CUST-10 [POS]: Get active customers list
  res = await request('/customers/active', {}, token);
  passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
  record('TC-CUST-10', 'Customer', 'Get active customers list endpoint', 'POSITIVE', '200 OK with active array', res.status, passed, `Active count: ${res.data?.length || 0}`);

  // TC-CUST-11 [POS]: Filter customers by type (WHOLESALE)
  res = await request('/customers/type/WHOLESALE', {}, token);
  passed = res.status === 200 && res.data.content !== undefined;
  record('TC-CUST-11', 'Customer', 'Filter customers by CustomerType enum', 'POSITIVE', '200 OK', res.status, passed);

  // TC-CUST-12 [POS]: Pagination check (size=2)
  res = await request('/customers?page=0&size=2', {}, token);
  passed = res.status === 200 && res.data.content && res.data.content.length <= 2;
  record('TC-CUST-12', 'Customer', 'Customer pagination limit size=2', 'POSITIVE', '200 OK with size <= 2', res.status, passed);

  // --- NEGATIVE CUSTOMER TESTS ---
  // TC-CUST-13 [NEG]: Blank customer name
  res = await request('/customers', {
    method: 'POST',
    body: { name: '', phoneNumber: `984321${timestamp}` }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-13', 'Customer', 'Blank customer name rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-14 [NEG]: Null customer name
  res = await request('/customers', {
    method: 'POST',
    body: { name: null, phoneNumber: `984321${timestamp}` }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-14', 'Customer', 'Null customer name rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-15 [NEG]: Missing phone number
  res = await request('/customers', {
    method: 'POST',
    body: { name: 'Missing Phone Customer' }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-15', 'Customer', 'Missing phone number rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-16 [NEG]: Phone number with under 10 digits (9 digits)
  res = await request('/customers', {
    method: 'POST',
    body: { name: 'Short Phone Customer', phoneNumber: '987654321' }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-16', 'Customer', 'Short phone number (<10 digits) rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-17 [NEG]: Phone number exceeding 15 digits (16 digits)
  res = await request('/customers', {
    method: 'POST',
    body: { name: 'Long Phone Customer', phoneNumber: '9876543210123456' }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-17', 'Customer', 'Oversized phone number (>15 digits) rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-18 [NEG]: Phone number with alphabetic characters
  res = await request('/customers', {
    method: 'POST',
    body: { name: 'Alpha Phone Customer', phoneNumber: '98765ABCDE' }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-18', 'Customer', 'Non-numeric phone characters rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-19 [NEG]: Phone number with special symbols (!@#$)
  res = await request('/customers', {
    method: 'POST',
    body: { name: 'Symbol Phone Customer', phoneNumber: '98765@#$21' }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-19', 'Customer', 'Special symbol phone rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-20 [NEG]: Duplicate phone number constraint
  res = await request('/customers', {
    method: 'POST',
    body: { name: 'Duplicate Phone Attempt', phoneNumber: uniquePhone }
  }, token);
  passed = res.status === 400 || res.status === 409;
  record('TC-CUST-20', 'Customer', 'Duplicate phone number uniqueness constraint', 'NEGATIVE', '400/409 Conflict', res.status, passed);

  // TC-CUST-21 [NEG]: Invalid email format (missing @ and domain)
  res = await request('/customers', {
    method: 'POST',
    body: { name: 'Bad Email Customer', email: 'not-an-email', phoneNumber: `983211${timestamp}` }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-21', 'Customer', 'Malformed email format rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-22 [NEG]: Invalid CustomerType enum value
  res = await request('/customers', {
    method: 'POST',
    body: { name: 'Bad Type Customer', phoneNumber: `983222${timestamp}`, customerType: 'INVALID_TYPE_XYZ' }
  }, token);
  passed = res.status === 400;
  record('TC-CUST-22', 'Customer', 'Invalid CustomerType enum rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CUST-23 [NEG]: Retrieve non-existent customer ID (999999)
  res = await request('/customers/9999999', {}, token);
  passed = res.status === 404;
  record('TC-CUST-23', 'Customer', 'Get non-existent customer by ID', 'NEGATIVE', '404 Not Found', res.status, passed);

  // TC-CUST-24 [NEG]: Update non-existent customer ID
  res = await request('/customers/9999999', {
    method: 'PUT',
    body: { name: 'Ghost Update', phoneNumber: '9876543210' }
  }, token);
  passed = res.status === 404;
  record('TC-CUST-24', 'Customer', 'Update non-existent customer ID', 'NEGATIVE', '404 Not Found', res.status, passed);

  // ========================================================================
  // SUB-SUITE 2: CATEGORIES & BRANDS (12 TEST CASES: 6 POSITIVE, 6 NEGATIVE)
  // ========================================================================
  console.log('\n--- Sub-suite 2: Categories & Brands Master Data ---');

  // TC-CAT-01 [POS]: Create new Product Category
  res = await request('/categories', {
    method: 'POST',
    body: {
      name: `Ceramics Category ${timestamp}`,
      description: 'Vitreous china and premium ceramic sanitaryware'
    }
  }, token);
  passed = res.status === 201 && !!res.data.id;
  testCategoryId = res.data?.id;
  record('TC-CAT-01', 'Category', 'Create valid category', 'POSITIVE', '201 Created', res.status, passed, `Category ID: ${testCategoryId}`);

  // TC-CAT-02 [POS]: Create sub-category with parentId
  res = await request('/categories', {
    method: 'POST',
    body: {
      name: `Wall Hung Basins ${timestamp}`,
      description: 'Sub-category of ceramics',
      parentId: testCategoryId
    }
  }, token);
  passed = res.status === 201;
  record('TC-CAT-02', 'Category', 'Create nested sub-category with parentId', 'POSITIVE', '201 Created', res.status, passed);

  // TC-CAT-03 [POS]: Get all categories
  res = await request('/categories', {}, token);
  passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
  record('TC-CAT-03', 'Category', 'Get categories list', 'POSITIVE', '200 OK array', res.status, passed, `Total categories: ${res.data?.length}`);

  // TC-BRD-01 [POS]: Create new Brand
  res = await request('/brands', {
    method: 'POST',
    body: {
      name: `Kohler Luxury ${timestamp}`,
      description: 'Global sanitaryware and fixture manufacturer',
      logoUrl: 'https://example.com/kohler.png'
    }
  }, token);
  passed = res.status === 201 && !!res.data.id;
  testBrandId = res.data?.id;
  record('TC-BRD-01', 'Brand', 'Create valid Brand', 'POSITIVE', '201 Created', res.status, passed, `Brand ID: ${testBrandId}`);

  // TC-BRD-02 [POS]: Get all brands
  res = await request('/brands', {}, token);
  passed = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
  record('TC-BRD-02', 'Brand', 'Get brands list', 'POSITIVE', '200 OK array', res.status, passed, `Total brands: ${res.data?.length}`);

  // TC-BRD-03 [POS]: Update Brand information
  res = await request(`/brands/${testBrandId}`, {
    method: 'PUT',
    body: {
      name: `Kohler Luxury ${timestamp} Premier`,
      description: 'Updated brand description'
    }
  }, token);
  passed = res.status === 200;
  record('TC-BRD-03', 'Brand', 'Update existing Brand details', 'POSITIVE', '200 OK', res.status, passed);

  // --- NEGATIVE CATEGORY & BRAND TESTS ---
  // TC-CAT-04 [NEG]: Blank category name
  res = await request('/categories', {
    method: 'POST',
    body: { name: '', description: 'Blank category' }
  }, token);
  passed = res.status === 400;
  record('TC-CAT-04', 'Category', 'Blank category name rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CAT-05 [NEG]: Null category name
  res = await request('/categories', {
    method: 'POST',
    body: { name: null }
  }, token);
  passed = res.status === 400;
  record('TC-CAT-05', 'Category', 'Null category name rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-CAT-06 [NEG]: Category with non-existent parentId
  res = await request('/categories', {
    method: 'POST',
    body: { name: 'Orphan Category', parentId: 999999 }
  }, token);
  passed = res.status === 400 || res.status === 404;
  record('TC-CAT-06', 'Category', 'Non-existent parentId rejection', 'NEGATIVE', '400/404', res.status, passed);

  // TC-BRD-04 [NEG]: Delete non-existent brand ID
  res = await request('/brands/999999', { method: 'DELETE' }, token);
  passed = res.status === 404;
  record('TC-BRD-04', 'Brand', 'Delete non-existent brand ID rejection', 'NEGATIVE', '404 Not Found', res.status, passed);

  // TC-BRD-05 [NEG]: Get non-existent brand ID (999999)
  res = await request('/brands/999999', {}, token);
  passed = res.status === 404;
  record('TC-BRD-05', 'Brand', 'Get non-existent brand ID', 'NEGATIVE', '404 Not Found', res.status, passed);

  // TC-BRD-06 [NEG]: Update non-existent brand ID
  res = await request('/brands/999999', {
    method: 'PUT',
    body: { name: 'Ghost Brand Update' }
  }, token);
  passed = res.status === 404;
  record('TC-BRD-06', 'Brand', 'Update non-existent brand ID', 'NEGATIVE', '404 Not Found', res.status, passed);

  // ========================================================================
  // SUB-SUITE 3: PRODUCTS & CATALOG (24 TEST CASES: 12 POSITIVE, 12 NEGATIVE)
  // ========================================================================
  console.log('\n--- Sub-suite 3: Products & Catalog Validations ---');

  // TC-PROD-01 [POS]: Create valid product with standard GST (18%)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: uniqueSku,
      name: `Ceramic Table Basin ${timestamp}`,
      description: 'High gloss ceramic basin with pop-up waste',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 5999.00,
      sellingPrice: 4800.00,
      purchasePrice: 3200.00,
      stockQuantity: 40,
      reorderLevel: 8,
      gstRate: 18.0,
      hsnCode: '69101000'
    }
  }, token);
  passed = res.status === 201 && !!res.data.id;
  testProductId = res.data?.id;
  record('TC-PROD-01', 'Product', 'Create valid sanitaryware product with 18% GST', 'POSITIVE', '201 Created', res.status, passed, `Product ID: ${testProductId}`);

  // TC-PROD-02 [POS]: Create product with 0% GST (exempt goods)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-ZERO-${timestamp}`,
      name: `Manual Flush Valve ${timestamp}`,
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 1200.00,
      sellingPrice: 999.00,
      stockQuantity: 25,
      reorderLevel: 5,
      gstRate: 0.0
    }
  }, token);
  passed = res.status === 201;
  record('TC-PROD-02', 'Product', 'Create product with 0% GST (Tax Exempt)', 'POSITIVE', '201 Created', res.status, passed);

  // TC-PROD-03 [POS]: Create product with 28% GST (luxury fittings)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-LUX-${timestamp}`,
      name: `Gold Plated Waterfall Faucet ${timestamp}`,
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 24999.00,
      sellingPrice: 19500.00,
      stockQuantity: 10,
      reorderLevel: 2,
      gstRate: 28.0
    }
  }, token);
  passed = res.status === 201;
  record('TC-PROD-03', 'Product', 'Create product with 28% GST (Luxury bracket)', 'POSITIVE', '201 Created', res.status, passed);

  // TC-PROD-04 [POS]: Create product with 0 stock quantity (initial out-of-stock)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-OOS-${timestamp}`,
      name: `Smart Bidet Seat ${timestamp}`,
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 35000.00,
      sellingPrice: 28000.00,
      stockQuantity: 0,
      reorderLevel: 5,
      gstRate: 18.0
    }
  }, token);
  passed = res.status === 201 && res.data.stockQuantity === 0;
  record('TC-PROD-04', 'Product', 'Create product with 0 stock quantity', 'POSITIVE', '201 Created with stock=0', res.status, passed);

  // TC-PROD-05 [POS]: Retrieve product by ID
  res = await request(`/products/${testProductId}`, {}, token);
  passed = res.status === 200 && res.data.id === testProductId;
  record('TC-PROD-05', 'Product', 'Get product by ID', 'POSITIVE', '200 OK', res.status, passed, res.data?.name);

  // TC-PROD-06 [POS]: Search product by unique SKU query
  res = await request(`/products/search?query=${uniqueSku}`, {}, token);
  passed = res.status === 200 && res.data.content && res.data.content.length > 0;
  record('TC-PROD-06', 'Product', 'Search product by unique SKU query', 'POSITIVE', '200 OK with content', res.status, passed);

  // TC-PROD-07 [POS]: Search products by partial name
  res = await request(`/products/search?query=Ceramic`, {}, token);
  passed = res.status === 200 && res.data.content && res.data.content.length > 0;
  record('TC-PROD-07', 'Product', 'Search product by partial name query', 'POSITIVE', '200 OK with content', res.status, passed);

  // TC-PROD-08 [POS]: Filter products by category ID
  res = await request(`/products/category/${testCategoryId}`, {}, token);
  passed = res.status === 200 && res.data.content && res.data.content.length > 0;
  record('TC-PROD-08', 'Product', 'Filter products by category ID', 'POSITIVE', '200 OK with content', res.status, passed);

  // TC-PROD-09 [POS]: Filter products by brand ID
  res = await request(`/products/brand/${testBrandId}`, {}, token);
  passed = res.status === 200 && res.data.content && res.data.content.length > 0;
  record('TC-PROD-09', 'Product', 'Filter products by brand ID', 'POSITIVE', '200 OK with content', res.status, passed);

  // TC-PROD-10 [POS]: Update product prices and description (with reorderLevel)
  res = await request(`/products/${testProductId}`, {
    method: 'PUT',
    body: {
      sku: uniqueSku,
      name: `Ceramic Table Basin ${timestamp} Platinum`,
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 6499.00,
      sellingPrice: 5199.00,
      stockQuantity: 40,
      reorderLevel: 10,
      gstRate: 18.0,
      description: 'Updated with antibacterial nano-glaze'
    }
  }, token);
  passed = res.status === 200 && res.data.sellingPrice === 5199.00;
  record('TC-PROD-10', 'Product', 'Update existing product pricing & description', 'POSITIVE', '200 OK with 5199 price', res.status, passed);

  // TC-PROD-11 [POS]: Product pagination limit check (size=3)
  res = await request('/products?page=0&size=3', {}, token);
  passed = res.status === 200 && res.data.content && res.data.content.length <= 3;
  record('TC-PROD-11', 'Product', 'Product catalog pagination size=3', 'POSITIVE', '200 OK with size <= 3', res.status, passed);

  // TC-PROD-12 [POS]: Check low stock products list endpoint
  res = await request('/products/low-stock', {}, token);
  passed = res.status === 200 && Array.isArray(res.data);
  record('TC-PROD-12', 'Product', 'Get low stock products endpoint', 'POSITIVE', '200 OK array', res.status, passed);

  // --- NEGATIVE PRODUCT TESTS ---
  // TC-PROD-13 [NEG]: Blank SKU
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: '',
      name: 'Missing SKU Basin',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 2000,
      sellingPrice: 1500,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-13', 'Product', 'Blank SKU rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-14 [NEG]: Null SKU
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: null,
      name: 'Null SKU Basin',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 2000,
      sellingPrice: 1500,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-14', 'Product', 'Null SKU rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-15 [NEG]: Duplicate SKU constraint
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: uniqueSku, // Duplicate
      name: 'Duplicate SKU Basin',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 2000,
      sellingPrice: 1500,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400 || res.status === 409;
  record('TC-PROD-15', 'Product', 'Duplicate SKU uniqueness rejection', 'NEGATIVE', '400/409 Conflict', res.status, passed);

  // TC-PROD-16 [NEG]: Blank product name
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-NONAME-${timestamp}`,
      name: '',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 2000,
      sellingPrice: 1500,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-16', 'Product', 'Blank product name rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-17 [NEG]: Missing category ID
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-NOCAT-${timestamp}`,
      name: 'No Category Product',
      brandId: testBrandId,
      mrp: 2000,
      sellingPrice: 1500,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-17', 'Product', 'Missing category ID rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-18 [NEG]: Missing brand ID
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-NOBRD-${timestamp}`,
      name: 'No Brand Product',
      categoryId: testCategoryId,
      mrp: 2000,
      sellingPrice: 1500,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-18', 'Product', 'Missing brand ID rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-19 [NEG]: Negative MRP value (-500)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-NEGMP-${timestamp}`,
      name: 'Negative MRP Product',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: -500.00,
      sellingPrice: 1000.00,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-19', 'Product', 'Negative MRP rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-20 [NEG]: Zero MRP (mrp = 0)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-ZEROMRP-${timestamp}`,
      name: 'Zero MRP Product',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 0.00,
      sellingPrice: 1000.00,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-20', 'Product', 'Zero MRP value rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-21 [NEG]: Negative selling price (-100)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-NEGSP-${timestamp}`,
      name: 'Negative Selling Price Product',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 2000.00,
      sellingPrice: -100.00,
      stockQuantity: 10
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-21', 'Product', 'Negative selling price rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-22 [NEG]: Negative stock quantity (-15)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-NEGSTK-${timestamp}`,
      name: 'Negative Stock Product',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 2000.00,
      sellingPrice: 1500.00,
      stockQuantity: -15
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-22', 'Product', 'Negative stock quantity rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-23 [NEG]: Negative GST rate (-5%)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-NEGGST-${timestamp}`,
      name: 'Negative GST Product',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 2000.00,
      sellingPrice: 1500.00,
      stockQuantity: 10,
      gstRate: -5.0
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-23', 'Product', 'Negative GST rate rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  // TC-PROD-24 [NEG]: Excessive GST rate (> 100%)
  res = await request('/products', {
    method: 'POST',
    body: {
      sku: `SKU-MAXGST-${timestamp}`,
      name: 'Excessive GST Product',
      categoryId: testCategoryId,
      brandId: testBrandId,
      mrp: 2000.00,
      sellingPrice: 1500.00,
      stockQuantity: 10,
      gstRate: 150.0 // > 100%
    }
  }, token);
  passed = res.status === 400;
  record('TC-PROD-24', 'Product', 'Excessive GST rate (>100%) rejection', 'NEGATIVE', '400 Bad Request', res.status, passed);

  console.log('\n========================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Phase 2 Audit Complete: ${passedCount} / ${results.length} PASSED`);
  console.log('========================================================================');

  // Save report JSON
  fs.writeFileSync(
    path.join(__dirname, '..', '..', 'docs', 'phase2-audit-results.json'),
    JSON.stringify(results, null, 2)
  );
}

runPhase2Audit().catch(err => {
  console.error('Phase 2 Execution Error:', err);
  process.exit(1);
});
