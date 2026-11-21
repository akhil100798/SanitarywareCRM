# Phase 2: Customer Directory & Master Catalog — 60-Point Audit Report
**Sanitaryware CRM Enterprise Platform — Version 1.1.0**  
**Execution Date**: November 16, 2026  
**Auditor**: Principal QA Automation & Manual Verification Engineer  
**Scope**: 60 Comprehensive Test Cases (30 Positive & 30 Negative) covering Customer Operations, Phone Normalization, Uniqueness Constraints, Category Trees, Brand Management, Product SKUs, Tax Rates, and Pricing Invariants.

---

## 1. Executive Summary

| Total Test Cases | Positive Cases | Negative Cases | Passed | Failed | Pass Rate | Audit Decision |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **60** | **30** | **30** | **60** | **0** | **100.0%** | **PASSED (PRODUCTION READY)** |

All 60 automated test cases were executed against the live, containerized staging stack (`http://localhost`, Spring Boot 3.2.2 REST backend on `http://localhost:8081/api`, and MySQL 8.4 database). The system exhibited complete mathematical and schema consistency with 0 regressions.

---

## 2. Complete 60-Case Verification Matrix

### Sub-Suite 1: Customer Directory & Form Validation (24 Cases: 12 Positive, 12 Negative)

| Test ID | Type | Scenario Description | Inputs / Payload | Expected Response | Actual Response | Status |
|:---|:---:|:---|:---|:---|:---|:---:|
| **TC-CUST-01** | POS | Create Retail Customer | 10-digit phone, address, city, state, pin | `201 Created` with valid ID | Created (ID: generated) | **PASS** |
| **TC-CUST-02** | POS | +91 Country Code Phone | `+91 98888 XXXX` format | `201 Created` with phone stripped | Created, normalized to digits | **PASS** |
| **TC-CUST-03** | POS | Hyphenated Phone Number | `977-654-XXXX` format | `201 Created` | Created, presentation chars stripped | **PASS** |
| **TC-CUST-04** | POS | GSTIN & Contractor Type | `29ABCDE1234F1Z5`, CONTRACTOR type | `201 Created` | Created with business details | **PASS** |
| **TC-CUST-05** | POS | Builder Customer Type | Type `BUILDER` | `201 Created` | Created with BUILDER enum | **PASS** |
| **TC-CUST-06** | POS | Retrieve Customer by ID | `GET /api/customers/{id}` | `200 OK` with customer payload | Retrieved customer profile | **PASS** |
| **TC-CUST-07** | POS | Search by Partial Name | `GET /api/customers/search?query=Anita` | `200 OK` with matched list | Matched records returned | **PASS** |
| **TC-CUST-08** | POS | Search by Phone Query | `GET /api/customers/search?query={phone}` | `200 OK` with matched list | Matched records returned | **PASS** |
| **TC-CUST-09** | POS | Update Customer Profile | `PUT /api/customers/{id}` updated notes | `200 OK` with updated notes | Updated profile committed | **PASS** |
| **TC-CUST-10** | POS | Active Customers Endpoint | `GET /api/customers/active` | `200 OK` with array of active users | Active customer roster loaded | **PASS** |
| **TC-CUST-11** | POS | Filter by CustomerType | `GET /api/customers/type/WHOLESALE` | `200 OK` with paginated content | Filtered wholesale records | **PASS** |
| **TC-CUST-12** | POS | Customer Pagination Limit | `GET /api/customers?page=0&size=2` | `200 OK` with size $\le 2$ | Page size bounded to 2 | **PASS** |
| **TC-CUST-13** | NEG | Blank Customer Name | `name: ""` | `400 Bad Request` | Rejected (`Customer name is required`) | **PASS** |
| **TC-CUST-14** | NEG | Null Customer Name | `name: null` | `400 Bad Request` | Rejected (`Customer name is required`) | **PASS** |
| **TC-CUST-15** | NEG | Missing Phone Number | Payload missing `phoneNumber` | `400 Bad Request` | Rejected (`Phone number is required`) | **PASS** |
| **TC-CUST-16** | NEG | Under 10 Digits Phone | `987654321` (9 digits) | `400 Bad Request` | Rejected (`At least 10 digits required`) | **PASS** |
| **TC-CUST-17** | NEG | Over 15 Digits Phone | 16-digit string | `400 Bad Request` | Rejected (`Cannot exceed 15 digits`) | **PASS** |
| **TC-CUST-18** | NEG | Alphabetic Characters in Phone | `98765ABCDE` | `400 Bad Request` | Rejected (`Invalid characters`) | **PASS** |
| **TC-CUST-19** | NEG | Special Symbols in Phone | `98765@#$21` | `400 Bad Request` | Rejected (`Invalid characters`) | **PASS** |
| **TC-CUST-20** | NEG | Duplicate Phone Uniqueness | Re-submit identical normalized phone | `400/409 Conflict` | Rejected (`Phone number already registered`) | **PASS** |
| **TC-CUST-21** | NEG | Malformed Email Address | `email: "not-an-email"` | `400 Bad Request` | Rejected (`Email must be valid`) | **PASS** |
| **TC-CUST-22** | NEG | Invalid CustomerType Enum | `customerType: "INVALID_XYZ"` | `400 Bad Request` | Rejected by JSON parser / enum mapping | **PASS** |
| **TC-CUST-23** | NEG | Non-existent Customer ID | `GET /api/customers/9999999` | `404 Not Found` | Handled with standard 404 response | **PASS** |
| **TC-CUST-24** | NEG | Update Non-existent ID | `PUT /api/customers/9999999` | `404 Not Found` | Handled with standard 404 response | **PASS** |

---

### Sub-Suite 2: Categories & Brands Master Data (12 Cases: 6 Positive, 6 Negative)

| Test ID | Type | Scenario Description | Inputs / Payload | Expected Response | Actual Response | Status |
|:---|:---:|:---|:---|:---|:---|:---:|
| **TC-CAT-01** | POS | Create Product Category | `name: "Ceramics Category"` | `201 Created` with valid ID | Category created | **PASS** |
| **TC-CAT-02** | POS | Create Nested Sub-Category | `parentId: {categoryId}` | `201 Created` with parent linked | Sub-category created with parentId | **PASS** |
| **TC-CAT-03** | POS | Retrieve All Categories | `GET /api/categories` | `200 OK` array of categories | Categories list retrieved | **PASS** |
| **TC-BRD-01** | POS | Create Brand | `name: "Kohler Luxury"`, logoUrl | `201 Created` with valid ID | Brand created | **PASS** |
| **TC-BRD-02** | POS | Retrieve All Brands | `GET /api/brands` | `200 OK` array of brands | Brands list retrieved | **PASS** |
| **TC-BRD-03** | POS | Update Brand Details | `PUT /api/brands/{id}` updated desc | `200 OK` with updated info | Brand details updated | **PASS** |
| **TC-CAT-04** | NEG | Blank Category Name | `name: ""` | `400 Bad Request` | Rejected (`Category name is required`) | **PASS** |
| **TC-CAT-05** | NEG | Null Category Name | `name: null` | `400 Bad Request` | Rejected (`Category name is required`) | **PASS** |
| **TC-CAT-06** | NEG | Non-existent Parent ID | `parentId: 999999` | `400/404 Not Found` | Handled cleanly without crash | **PASS** |
| **TC-BRD-04** | NEG | Delete Non-existent Brand | `DELETE /api/brands/999999` | `404 Not Found` | ResourceNotFoundException thrown | **PASS** |
| **TC-BRD-05** | NEG | Get Non-existent Brand | `GET /api/brands/999999` | `404 Not Found` | ResourceNotFoundException thrown | **PASS** |
| **TC-BRD-06** | NEG | Update Non-existent Brand | `PUT /api/brands/999999` | `404 Not Found` | ResourceNotFoundException thrown | **PASS** |

---

### Sub-Suite 3: Product Catalog, Pricing & Taxes (24 Cases: 12 Positive, 12 Negative)

| Test ID | Type | Scenario Description | Inputs / Payload | Expected Response | Actual Response | Status |
|:---|:---:|:---|:---|:---|:---|:---:|
| **TC-PROD-01** | POS | Create Product with 18% GST | Ceramic Table Basin, 18% GST | `201 Created` with valid ID | Product inserted with tax bracket | **PASS** |
| **TC-PROD-02** | POS | Create Exempt Product (0% GST) | Flush Valve, 0% GST rate | `201 Created` | Inserted with 0% tax | **PASS** |
| **TC-PROD-03** | POS | Create Luxury Product (28% GST) | Gold Waterfall Faucet, 28% GST | `201 Created` | Inserted with 28% tax | **PASS** |
| **TC-PROD-04** | POS | Initial Out-of-Stock Product | `stockQuantity: 0` | `201 Created` with stock=0 | Handled cleanly; 0 stock persisted | **PASS** |
| **TC-PROD-05** | POS | Retrieve Product by ID | `GET /api/products/{id}` | `200 OK` with product payload | Loaded product specifications | **PASS** |
| **TC-PROD-06** | POS | Search by Unique SKU | `GET /api/products/search?query={sku}` | `200 OK` with matched item | Exact SKU match returned | **PASS** |
| **TC-PROD-07** | POS | Search by Partial Name | `GET /api/products/search?query=Ceramic` | `200 OK` with results | Content list rendered | **PASS** |
| **TC-PROD-08** | POS | Filter by Category ID | `GET /api/products/category/{catId}` | `200 OK` with category items | Filtered list returned | **PASS** |
| **TC-PROD-09** | POS | Filter by Brand ID | `GET /api/products/brand/{brandId}` | `200 OK` with brand items | Filtered list returned | **PASS** |
| **TC-PROD-10** | POS | Update Price & Stock Level | Update sellingPrice to 5199, reorderLevel 10 | `200 OK` with updated values | Price & reorderLevel committed | **PASS** |
| **TC-PROD-11** | POS | Product Pagination Limit | `GET /api/products?page=0&size=3` | `200 OK` with size $\le 3$ | Pagination size verified | **PASS** |
| **TC-PROD-12** | POS | Low Stock Items List | `GET /api/products/low-stock` | `200 OK` array of alerts | Low stock roster loaded | **PASS** |
| **TC-PROD-13** | NEG | Blank SKU Rejection | `sku: ""` | `400 Bad Request` | Rejected (`SKU is required`) | **PASS** |
| **TC-PROD-14** | NEG | Null SKU Rejection | `sku: null` | `400 Bad Request` | Rejected (`SKU is required`) | **PASS** |
| **TC-PROD-15** | NEG | Duplicate SKU Constraint | Re-use existing unique SKU | `400/409 Conflict` | Rejected (`SKU already exists`) | **PASS** |
| **TC-PROD-16** | NEG | Blank Product Name | `name: ""` | `400 Bad Request` | Rejected (`Product name is required`) | **PASS** |
| **TC-PROD-17** | NEG | Missing Category ID | Payload missing `categoryId` | `400 Bad Request` | Rejected (`Category ID is required`) | **PASS** |
| **TC-PROD-18** | NEG | Missing Brand ID | Payload missing `brandId` | `400 Bad Request` | Rejected (`Brand ID is required`) | **PASS** |
| **TC-PROD-19** | NEG | Negative MRP Value | `mrp: -500.00` | `400 Bad Request` | Rejected (`MRP must be greater than 0`) | **PASS** |
| **TC-PROD-20** | NEG | Zero MRP Value | `mrp: 0.00` | `400 Bad Request` | Rejected (`MRP must be greater than 0`) | **PASS** |
| **TC-PROD-21** | NEG | Negative Selling Price | `sellingPrice: -100.00` | `400 Bad Request` | Rejected (`Selling price must be > 0`) | **PASS** |
| **TC-PROD-22** | NEG | Negative Stock Quantity | `stockQuantity: -15` | `400 Bad Request` | Rejected (`Stock cannot be negative`) | **PASS** |
| **TC-PROD-23** | NEG | Negative GST Rate | `gstRate: -5.0` | `400 Bad Request` | Rejected (`GST rate cannot be negative`) | **PASS** |
| **TC-PROD-24** | NEG | Excessive GST Rate (>100%) | `gstRate: 150.0` | `400 Bad Request` | Rejected (`GST rate cannot exceed 100%`) | **PASS** |

---

## 3. Key Architectural Observations

1. **Phone Normalization Contract (`PhoneUtil.java`)**:
   - The system permits standard presentation characters (`+`, spaces, hyphens, parentheses), stripping them transparently before persisting the raw digit string to MySQL.
   - Enforces a strict minimum of 10 digits and a maximum of 15 digits (`TC-CUST-16`, `TC-CUST-17`).
   - Duplicate normalized phone numbers are strictly blocked by the unique database constraint (`TC-CUST-20`).
2. **Product SKU Immutability & Conflict Handling**:
   - Duplicate SKU entries are intercepted both by service validation (`findBySku`) and MySQL unique keys, returning `409 Conflict` with clear error details (`TC-PROD-15`).
3. **Financial & Tax Bounds Validation**:
   - `MRP` and `sellingPrice` enforce strict `@DecimalMin(value = "0.0", inclusive = false)` preventing negative or zero-priced items (`TC-PROD-19`, `TC-PROD-20`, `TC-PROD-21`).
   - GST tax rates are bounded to valid percentages $0\% \le \text{rate} \le 100\%$ (`TC-PROD-23`, `TC-PROD-24`).

---

### Phase 2 Sign-Off
- **Status**: **ALL 60 TEST CASES PASSED (100%)**
- **Artifact Report**: [docs/PHASE-2-QA-TEST-REPORT.md](file:///c:/Users/akhil/OneDrive/Desktop/Workspace/New%20folder/SanitarywareCRM/docs/PHASE-2-QA-TEST-REPORT.md)
- **JSON Raw Metrics**: [docs/phase2-audit-results.json](file:///c:/Users/akhil/OneDrive/Desktop/Workspace/New%20folder/SanitarywareCRM/docs/phase2-audit-results.json)
