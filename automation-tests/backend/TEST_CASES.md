# Backend API Test Cases

> [!NOTE]
> **Status**: Not executed yet (Staged for local automation).

---

## 1. Positive Test Cases (POS-001 to POS-035)

| Test ID | Module | Scenario | Preconditions | Test Steps | Expected Result | Priority | Automation Tool |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS-001** | Auth | Register Admin User | Clean DB | POST `/api/auth/register` with admin DTO | 200 OK, returns user profile, role: `ADMIN`. | Critical | MockMvc |
| **POS-002** | Auth | Register Sales User | Admin exists | POST `/api/auth/register` with sales DTO | 200 OK, returns user profile, role: `SALES`. | High | MockMvc |
| **POS-003** | Auth | Login Admin | Admin exists | POST `/api/auth/login` | 200 OK, returns JWT token. | Critical | MockMvc |
| **POS-004** | Auth | Login Sales | Sales exists | POST `/api/auth/login` | 200 OK, returns JWT token. | Critical | MockMvc |
| **POS-005** | Auth | Get Profile | Logged in | GET `/api/auth/me` with JWT | 200 OK, returns profile data. | High | MockMvc |
| **POS-006** | Auth | Update Profile | Logged in | PUT `/api/auth/profile` | 200 OK, profile details updated. | Medium | MockMvc |
| **POS-007** | Category | Create Root Category | Admin logged in | POST `/api/categories` with category DTO | 200 OK, category created. | High | MockMvc |
| **POS-008** | Category | Create Sub-Category | Parent exists | POST `/api/categories` with parentId | 200 OK, sub-category created. | High | MockMvc |
| **POS-009** | Category | List Categories | Categories exist | GET `/api/categories` | 200 OK, returns category list. | Medium | MockMvc |
| **POS-010** | Category | Get Category by ID | Category exists | GET `/api/categories/{id}` | 200 OK, returns category details. | Medium | MockMvc |
| **POS-011** | Category | Update Category | Category exists | PUT `/api/categories/{id}` | 200 OK, category details updated. | Medium | MockMvc |
| **POS-012** | Brand | Create Brand | Admin logged in | POST `/api/brands` | 200 OK, brand created. | High | MockMvc |
| **POS-013** | Brand | List Brands | Brands exist | GET `/api/brands` | 200 OK, returns brand list. | Medium | MockMvc |
| **POS-014** | Brand | Update Brand | Brand exists | PUT `/api/brands/{id}` | 200 OK, brand details updated. | Medium | MockMvc |
| **POS-015** | Product | Create Product | Brand & Category exist | POST `/api/products` | 200 OK, product created. | Critical | MockMvc |
| **POS-016** | Product | Update Product | Product exists | PUT `/api/products/{id}` | 200 OK, product details updated. | High | MockMvc |
| **POS-017** | Product | List Products | Products exist | GET `/api/products` | 200 OK, returns page of products. | Medium | MockMvc |
| **POS-018** | Product | Search Products | Products exist | GET `/api/products/search` | 200 OK, returns matched products. | High | MockMvc |
| **POS-019** | Product | Update Stock | Product exists | PATCH `/api/products/{id}/stock` | 200 OK, stock replenished. | High | MockMvc |
| **POS-020** | Product | Get Low Stock | Low stock products exist | GET `/api/products/low-stock` | 200 OK, returns low stock products. | Medium | MockMvc |
| **POS-021** | Product | Get Featured | Featured products exist | GET `/api/products/featured` | 200 OK, returns featured products. | Low | MockMvc |
| **POS-022** | Customer | Create Customer | Admin logged in | POST `/api/customers` | 200 OK, customer created. | High | MockMvc |
| **POS-023** | Customer | List Customers | Customers exist | GET `/api/customers` | 200 OK, returns customer list. | Medium | MockMvc |
| **POS-024** | Customer | Update Customer | Customer exists | PUT `/api/customers/{id}` | 200 OK, customer updated. | Medium | MockMvc |
| **POS-025** | Distributor | Create Distributor | Admin logged in | POST `/api/distributors` | 200 OK, distributor created. | High | MockMvc |
| **POS-026** | Distributor | List Distributors | Distributors exist | GET `/api/distributors` | 200 OK, returns distributor list. | Medium | MockMvc |
| **POS-027** | Quotation | Create Quotation | Product & Customer exist | POST `/api/quotations` | 200 OK, quotation created in `DRAFT`. | Critical | MockMvc |
| **POS-028** | Quotation | Update Status to Sent | Quotation exists | PATCH `/api/quotations/{id}/status` | 200 OK, status updated to `SENT`. | High | MockMvc |
| **POS-029** | Quotation | Generate Quotation PDF | Quotation exists | GET `/api/quotations/{id}/pdf` | 200 OK, streams PDF bytes. | REST Assured |
| **POS-030** | Order | Convert Quotation | Accepted quotation exists | POST `/api/orders/from-quotation/{id}` | 200 OK, order created, status `PENDING`. | Critical | MockMvc |
| **POS-031** | Order | Generate Invoice PDF | Order exists | GET `/api/orders/{id}/invoice/pdf` | 200 OK, streams PDF bytes. | REST Assured |
| **POS-032** | Payment | Record Full Payment | Order exists with balance | POST `/api/payments` | 200 OK, payment saved, balance is 0. | Critical | MockMvc |
| **POS-033** | Purchase Order | Create PO | Distributor exists | POST `/api/purchase-orders` | 200 OK, PO created, status `DRAFT`. | High | MockMvc |
| **POS-034** | Dashboard | Get Stats | Data exists in DB | GET `/api/dashboard/stats` | 200 OK, returns stats JSON. | Low | MockMvc |
| **POS-035** | Health | Get Public Health | Server is running | GET `/api/health` | 200 OK, returns UP status. | curl |

---

## 2. Negative Test Cases (NEG-001 to NEG-040)

| Test ID | Module | Scenario | Preconditions | Test Steps | Expected Error/Result | Priority | Automation Tool |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NEG-001** | Auth | Login with invalid username | User does not exist | POST `/api/auth/login` | 401 Unauthorized: "Bad credentials". | Critical | MockMvc |
| **NEG-002** | Auth | Login with incorrect password | User exists | POST `/api/auth/login` | 401 Unauthorized: "Bad credentials". | Critical | MockMvc |
| **NEG-003** | Auth | Login with missing fields | Valid user | POST `/api/auth/login` with empty body | 400 Bad Request / Validation failed. | High | MockMvc |
| **NEG-004** | Auth | Register duplicate username | User exists | POST `/api/auth/register` | 400 Bad Request: "Username already taken". | High | MockMvc |
| **NEG-005** | Auth | Register duplicate email | User exists | POST `/api/auth/register` | 400 Bad Request: "Email already in use". | High | MockMvc |
| **NEG-006** | Auth | Access profile without JWT | Logged out | GET `/api/auth/me` | 401 Unauthorized: "Full authentication required". | Critical | MockMvc |
| **NEG-007** | Auth | Access profile with expired JWT | Expired token | GET `/api/auth/me` with expired token | 401 Unauthorized: "JWT signature expired". | Critical | MockMvc |
| **NEG-008** | Auth | Access profile with malformed JWT | Bad token | GET `/api/auth/me` with header `Bearer abc` | 401 Unauthorized: "Malformed JWT". | Critical | MockMvc |
| **NEG-009** | Users | Unauthorized category deletion | Logged in as Sales | DELETE `/api/categories/1` | 403 Forbidden: "Access is denied". | Critical | MockMvc |
| **NEG-010** | Users | Unauthorized brand deletion | Logged in as Sales | DELETE `/api/brands/1` | 403 Forbidden: "Access is denied". | Critical | MockMvc |
| **NEG-011** | Category | Create Category duplicate name | Category exists | POST `/api/categories` with duplicate name | 400 Bad Request: "Category name already exists". | High | MockMvc |
| **NEG-012** | Category | Create Category empty name | Admin active | POST `/api/categories` with empty name | 400 Bad Request / Validation failed. | Medium | MockMvc |
| **NEG-013** | Category | Category parent recursion | Category exists | PUT `/api/categories/{id}` parentId = id | 400 Bad Request: "Category cannot be its own parent". | High | MockMvc |
| **NEG-014** | Brand | Create Brand duplicate name | Brand exists | POST `/api/brands` with duplicate name | 400 Bad Request: "Brand name already exists". | High | MockMvc |
| **NEG-015** | Brand | Create Brand empty name | Admin active | POST `/api/brands` with empty name | 400 Bad Request / Validation failed. | Medium | MockMvc |
| **NEG-016** | Product | Create Product duplicate SKU | SKU exists | POST `/api/products` with duplicate SKU | 400 Bad Request: "SKU already exists". | High | MockMvc |
| **NEG-017** | Product | Create Product invalid price | Admin active | POST `/api/products` with negative price | 400 Bad Request: "MRP must be greater than zero". | High | MockMvc |
| **NEG-018** | Product | Create Product negative stock | Admin active | POST `/api/products` with negative stock | 400 Bad Request: "Stock quantity cannot be negative". | High | MockMvc |
| **NEG-019** | Product | Create Product invalid Category | Category missing | POST `/api/products` with invalid categoryId | 404 Not Found: "Category not found". | High | MockMvc |
| **NEG-020** | Product | Create Product invalid Brand | Brand missing | POST `/api/products` with invalid brandId | 404 Not Found: "Brand not found". | High | MockMvc |
| **NEG-021** | Product | Get non-existent product | Empty DB | GET `/api/products/999` | 404 Not Found: "Product not found". | Medium | MockMvc |
| **NEG-022** | Customer | Create Customer duplicate phone | Customer exists | POST `/api/customers` with duplicate phone | 400 Bad Request: "Phone number already registered". | High | MockMvc |
| **NEG-023** | Customer | Create Customer missing phone | Admin active | POST `/api/customers` with empty phone | 400 Bad Request / Validation failed. | Medium | MockMvc |
| **NEG-024** | Customer | Get non-existent customer | Empty DB | GET `/api/customers/999` | 404 Not Found: "Customer not found". | Medium | MockMvc |
| **NEG-025** | Distributor| Create Distributor duplicate email| Distributor exists| POST `/api/distributors` | 400 Bad Request: "Email already registered". | Medium | MockMvc |
| **NEG-026** | Distributor| Get non-existent distributor | Empty DB | GET `/api/distributors/999` | 404 Not Found: "Distributor not found". | Medium | MockMvc |
| **NEG-027** | Quotation | Create Quotation empty items | Customer exists | POST `/api/quotations` with empty items | 400 Bad Request: "Quotation must contain items". | High | MockMvc |
| **NEG-028** | Quotation | Create Quotation invalid customer| Customer missing | POST `/api/quotations` with bad customerId | 404 Not Found: "Customer not found". | High | MockMvc |
| **NEG-029** | Quotation | Create Quotation invalid product | Product missing | POST `/api/quotations` with bad productId | 404 Not Found: "Product not found". | High | MockMvc |
| **NEG-030** | Quotation | Create Quotation invalid quantity| Product exists | POST `/api/quotations` with negative quantity | 400 Bad Request: "Quantity must be greater than zero". | High | MockMvc |
| **NEG-031** | Quotation | Update status invalid enum | Quotation exists | PATCH `/api/quotations/{id}/status?status=COMPLETED`| 400 Bad Request: Invalid status value. | Medium | MockMvc |
| **NEG-032** | Quotation | Download PDF invalid ID | Empty DB | GET `/api/quotations/999/pdf` | 404 Not Found: "Quotation not found". | REST Assured |
| **NEG-033** | Order | Convert non-existent quotation | Empty DB | POST `/api/orders/from-quotation/999` | 404 Not Found: "Quotation not found". | MockMvc |
| **NEG-034** | Order | Convert already converted quote | Quote converted | POST `/api/orders/from-quotation/{id}` | 400 Bad Request: "Quotation already converted". | MockMvc |
| **NEG-035** | Order | Insufficient stock allocation | Stock < quantity | POST `/api/orders/from-quotation/{id}` | 400 Bad Request: "Insufficient stock". | MockMvc |
| **NEG-036** | Order | Download Invoice PDF invalid ID | Empty DB | GET `/api/orders/999/invoice/pdf` | 404 Not Found: "Order not found". | REST Assured |
| **NEG-037** | Payment | Record payment exceeds balance | Balance = 500 | POST `/api/payments` with amount 600 | 400 Bad Request: "Payment exceeds balance due". | Critical | MockMvc |
| **NEG-038** | Payment | Record payment invalid order | Empty DB | POST `/api/payments` with invalid orderId | 404 Not Found: "Order not found". | Critical | MockMvc |
| **NEG-039** | File | Upload invalid file type | Server is active | POST `/api/files/upload` with executable file | 400 Bad Request: "Invalid file type". | Medium | MockMvc |
| **NEG-040** | File | Download missing file | Empty DB | GET `/api/files/download/none.pdf` | 404 Not Found: "File not found". | MockMvc |
