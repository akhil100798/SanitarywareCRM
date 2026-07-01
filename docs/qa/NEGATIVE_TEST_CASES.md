# NEGATIVE TEST CASES

> [!NOTE]
> **Status of all test cases**: Not executed yet (Staged for local automation).

## 1. Backend / API Negative Test Cases (NEG-001 to NEG-040)

| Test ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Error/Result | Automation Tool | Suggested Test File Path | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NEG-001** | Auth | Login with invalid username | User does not exist | POST `/api/auth/login` | Username: `fakeuser`, Password: `Password@123` | 401 Unauthorized: "Bad credentials". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Critical |
| **NEG-002** | Auth | Login with incorrect password | User exists | POST `/api/auth/login` | Username: `qaadmin`, Password: `WrongPassword` | 401 Unauthorized: "Bad credentials". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Critical |
| **NEG-003** | Auth | Login with missing fields | Valid user | POST `/api/auth/login` with empty body | `{}` | 400 Bad Request / Validation failed. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | High |
| **NEG-004** | Auth | Register duplicate username | User exists | POST `/api/auth/register` | DTO with existing username | 400 Bad Request: "Username is already taken!". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | High |
| **NEG-005** | Auth | Register duplicate email | User exists | POST `/api/auth/register` | DTO with existing email | 400 Bad Request: "Email Address already in use!". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | High |
| **NEG-006** | Auth | Access profile without JWT | Logged out | GET `/api/auth/me` | No Authorization header | 401 Unauthorized: "Unauthorized: Full authentication is required". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Critical |
| **NEG-007** | Auth | Access profile with expired JWT | Expired token | GET `/api/auth/me` | Expired JWT token | 401 Unauthorized: "JWT signature validation failed/expired". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Critical |
| **NEG-008** | Auth | Access profile with malformed JWT | Bad token | GET `/api/auth/me` | Header: `Bearer abc` | 401 Unauthorized: "Malformed JWT". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Critical |
| **NEG-009** | Users | Unauthorized category deletion | Logged in as Sales | DELETE `/api/categories/1` | Sales JWT | 403 Forbidden: "Access is denied". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | Critical |
| **NEG-010** | Users | Unauthorized brand deletion | Logged in as Sales | DELETE `/api/brands/1` | Sales JWT | 403 Forbidden: "Access is denied". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/BrandControllerTest.java` | Critical |
| **NEG-011** | Category | Create Category duplicate name | Category exists | POST `/api/categories` | Name: `Pipes` | 400 Bad Request: "Category name already exists". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | High |
| **NEG-012** | Category | Create Category empty name | Admin active | POST `/api/categories` | Name: `""` | 400 Bad Request / Validation failed. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | Medium |
| **NEG-013** | Category | Category parent recursion | Category exists | PUT `/api/categories/{id}` | parentId matches category id | 400 Bad Request: "Category cannot be its own parent". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | High |
| **NEG-014** | Brand | Create Brand duplicate name | Brand exists | POST `/api/brands` | Name: `Supreme` | 400 Bad Request: "Brand name already exists". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/BrandControllerTest.java` | High |
| **NEG-015** | Brand | Create Brand empty name | Admin active | POST `/api/brands` | Name: `""` | 400 Bad Request / Validation failed. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/BrandControllerTest.java` | Medium |
| **NEG-016** | Product | Create Product duplicate SKU | SKU exists | POST `/api/products` | SKU: `SUP-PIPE-001` | 400 Bad Request: "SKU already exists". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | High |
| **NEG-017** | Product | Create Product invalid price | Admin active | POST `/api/products` | MRP: `-10.00` | 400 Bad Request: "MRP must be greater than zero". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | High |
| **NEG-018** | Product | Create Product negative stock | Admin active | POST `/api/products` | Stock: `-5` | 400 Bad Request: "Stock quantity cannot be negative". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | High |
| **NEG-019** | Product | Create Product invalid Category | Category missing | POST `/api/products` | categoryId: `999` | 404 Not Found: "Category not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | High |
| **NEG-020** | Product | Create Product invalid Brand | Brand missing | POST `/api/products` | brandId: `999` | 404 Not Found: "Brand not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | High |
| **NEG-021** | Product | Get non-existent product | Empty DB | GET `/api/products/999` | None | 404 Not Found: "Product not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | Medium |
| **NEG-022** | Customer | Create Customer duplicate phone | Customer exists | POST `/api/customers` | Phone: `9999999999` | 400 Bad Request: "Phone number already registered". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CustomerControllerTest.java` | High |
| **NEG-023** | Customer | Create Customer missing phone | Admin active | POST `/api/customers` | Phone: `""` | 400 Bad Request / Validation failed. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CustomerControllerTest.java` | Medium |
| **NEG-024** | Customer | Get non-existent customer | Empty DB | GET `/api/customers/999` | None | 404 Not Found: "Customer not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CustomerControllerTest.java` | Medium |
| **NEG-025** | Distributor| Create Distributor duplicate email| Distributor exists| POST `/api/distributors` | Email: `metro@dist.com` | 400 Bad Request: "Email address already registered". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/DistributorControllerTest.java` | Medium |
| **NEG-026** | Distributor| Get non-existent distributor | Empty DB | GET `/api/distributors/999` | None | 404 Not Found: "Distributor not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/DistributorControllerTest.java` | Medium |
| **NEG-027** | Quotation | Create Quotation empty items | Customer exists | POST `/api/quotations` | items list: `[]` | 400 Bad Request: "Quotation must contain at least one item". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | High |
| **NEG-028** | Quotation | Create Quotation invalid customer| Customer missing | POST `/api/quotations` | customerId: `999` | 404 Not Found: "Customer not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | High |
| **NEG-029** | Quotation | Create Quotation invalid product | Product missing | POST `/api/quotations` | items.product.id: `999` | 404 Not Found: "Product not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | High |
| **NEG-030** | Quotation | Create Quotation invalid quantity| Product exists | POST `/api/quotations` | items.quantity: `-5` | 400 Bad Request: "Quantity must be greater than zero". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | High |
| **NEG-031** | Quotation | Update status invalid enum | Quotation exists | PATCH `/api/quotations/{id}/status` | Status: `COMPLETED` | 400 Bad Request: "No enum constant QuotationStatus.COMPLETED". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | Medium |
| **NEG-032** | Quotation | Download PDF invalid ID | Empty DB | GET `/api/quotations/999/pdf` | None | 404 Not Found: "Quotation not found with id: 999". | REST Assured | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | High |
| **NEG-033** | Order | Convert non-existent quotation | Empty DB | POST `/api/orders/from-quotation/999`| None | 404 Not Found: "Quotation not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/OrderControllerTest.java` | Critical |
| **NEG-034** | Order | Convert already converted quote | Quote is `CONVERTED`| POST `/api/orders/from-quotation/{id}`| Converted Quote ID | 400 Bad Request: "Quotation already converted to an order". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/OrderControllerTest.java` | High |
| **NEG-035** | Order | Insufficient stock allocation | Quote qty > stock | POST `/api/orders/from-quotation/{id}`| Qty exceeds stock | 400 Bad Request: "Insufficient stock for product...". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/OrderControllerTest.java` | Critical |
| **NEG-036** | Order | Download Invoice PDF invalid ID | Empty DB | GET `/api/orders/999/invoice/pdf` | None | 404 Not Found: "Order not found with id: 999". | REST Assured | `backend/src/test/java/com/sanitaryware/crm/controller/OrderControllerTest.java` | High |
| **NEG-037** | Payment | Record payment exceeds balance | Order balance = 500 | POST `/api/payments` | Amount: `600` | 400 Bad Request: "Payment amount exceeds balance due". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/PaymentControllerTest.java` | Critical |
| **NEG-038** | Payment | Record payment invalid order | Empty DB | POST `/api/payments` | orderId: `999`, Amount: 10 | 404 Not Found: "Order not found with id: 999". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/PaymentControllerTest.java` | Critical |
| **NEG-039** | File | Upload invalid file type | Server is active | POST `/api/files/upload` | File: `virus.exe` | 400 Bad Request: "Invalid file type. Only images and PDFs allowed". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/FileUploadControllerTest.java` | Medium |
| **NEG-040** | File | Download missing file | File does not exist | GET `/api/files/download/general/none.pdf`| None | 404 Not Found: "File not found: none.pdf". | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/FileUploadControllerTest.java` | Medium |

## 2. Frontend / Admin Negative Test Cases (NEG-041 to NEG-065)

| Test ID | Page | Scenario | Preconditions | Test Steps | Expected UI Result | Expected API Call | Priority | Automation Tool | Suggested Test File Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NEG-041** | Login | Sign In with bad password | URL loaded | Fill username, wrong password, submit | Error alert "Bad credentials", remains on login. | `POST /api/auth/login` | Critical | Playwright | `frontend/tests/e2e/login.spec.js` |
| **NEG-042** | Login | Submit empty login form | URL loaded | Click Sign In button directly | Validator highlights fields, blocks request. | None | High | Playwright | `frontend/tests/e2e/login.spec.js` |
| **NEG-043** | Category | Create duplicate category error | Modal open | Fill existing name "Pipes", click save | Modal stays open, shows error: "Category name already exists". | `POST /api/categories` | High | Playwright | `frontend/tests/e2e/categories.spec.js` |
| **NEG-044** | Product | Create product validation error| Form open | Leave Name blank, save | Form highlights field, does not submit. | None | High | Playwright | `frontend/tests/e2e/products.spec.js` |
| **NEG-045** | Product | Create product negative price | Form open | Fill price `-100`, save | Validation error message displayed. | None | High | Playwright | `frontend/tests/e2e/products.spec.js` |
| **NEG-046** | Product | Create duplicate SKU error | Form open | Fill existing SKU, save | Form stays open, toast displays SKU error. | `POST /api/products` | High | Playwright | `frontend/tests/e2e/products.spec.js` |
| **NEG-047** | Customer | Create duplicate phone error | Form open | Fill existing phone number, save | Toast shows: "Phone number already registered". | `POST /api/customers` | High | Playwright | `frontend/tests/e2e/customers.spec.js` |
| **NEG-048** | Customer | Invalid email format | Form open | Fill `invalid-email`, save | Inline validator says "Invalid email format". | None | Medium | Playwright | `frontend/tests/e2e/customers.spec.js` |
| **NEG-049** | Customer | Invalid phone characters | Form open | Fill `abc1234`, save | Blocks alphabetic input in phone field. | None | Medium | Playwright | `frontend/tests/e2e/customers.spec.js` |
| **NEG-050** | Quotation | Submit empty quotation items | Form open | Select customer, leave items list empty, save| Toast warns: "Add at least one item". | None | High | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **NEG-051** | Quotation | Discount percentage exceeds 100 | Form open | Fill discount percentage `105`, save | Validation error: "Discount cannot exceed 100%". | None | Medium | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **NEG-052** | Quotation | Convert quotation fails (No stock)| Accepted quote | Click "Convert to Order" | Conversion error toast: "Insufficient stock...". | `POST /api/orders/from-quotation/{id}` | High | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **NEG-053** | Order | Record payment exceeds balance | Form open | Enter payment amount greater than balance, save| Toast: "Payment amount exceeds balance due". | `POST /api/payments` | Critical | Playwright | `frontend/tests/e2e/payments.spec.js` |
| **NEG-054** | Route | Blocked route redirect | Logged out | Navigate to `/dashboard` manually | Redirects to `/login`. | None | Critical | Playwright | `frontend/tests/e2e/routing.spec.js` |
| **NEG-055** | Global | Network disconnected offline | Running | Trigger network disconnect | Global alert: "You are offline. Reconnecting...". | Any request | High | Playwright | `frontend/tests/e2e/global.spec.js` |
| **NEG-056** | Product | Search with no matches | Products open | Search `xyzzy` | Displays: "No products found". | `GET /api/products/search` | Low | Playwright | `frontend/tests/e2e/products.spec.js` |
| **NEG-057** | Category | List load fails | Server down | Navigate to Categories | Displays: "Failed to fetch categories". | `GET /api/categories` | High | Playwright | `frontend/tests/e2e/categories.spec.js` |
| **NEG-058** | Product | Image upload size limit | Form open | Select 20MB image file | Toast: "File exceeds maximum size of 5MB". | None | Medium | Playwright | `frontend/tests/e2e/products.spec.js` |
| **NEG-059** | Product | Image upload type limit | Form open | Select `document.txt` | Toast: "Invalid file type. Only images allowed".| None | Medium | Playwright | `frontend/tests/e2e/products.spec.js` |
| **NEG-060** | Quotation | Download PDF network failure | List loaded | Server goes down, click Download PDF | Toast: "Failed to download PDF". | `GET /api/quotations/{id}/pdf` | High | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **NEG-061** | Order | Download Invoice network failure | List loaded | Server goes down, click Download Invoice | Toast: "Failed to download invoice". | `GET /api/orders/{id}/invoice/pdf` | High | Playwright | `frontend/tests/e2e/orders.spec.js` |
| **NEG-062** | Global | Server API 500 error handling | Any page | Trigger server crash | Toast: "Internal server error occurred". | Any request | High | Playwright | `frontend/tests/e2e/global.spec.js` |
| **NEG-063** | Settings | Missing required config fields | Settings open | Clear email, save | Validator highlights email field. | None | Low | Playwright | `frontend/tests/e2e/settings.spec.js` |
| **NEG-064** | Distributor| Create duplicate distributor phone| Form open | Fill existing phone, save | Toast: "Phone number already registered". | `POST /api/distributors` | High | Playwright | `frontend/tests/e2e/distributors.spec.js` |
| **NEG-065** | Purchase Order| Create PO negative quantity | Form open | Fill quantity `-10` | Inline validation error message displayed. | None | Medium | Playwright | `frontend/tests/e2e/purchase-orders.spec.js` |

## 3. Mobile Negative Test Cases (NEG-066 to NEG-085)

| Test ID | Screen | Scenario | Preconditions | Test Steps | Expected Error/Result | Priority | Suggested Test File Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NEG-066** | Login | Sign in with bad password | Welcome open | Enter details, tap Sign In | Access denied toast alert displays. | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-067** | Login | Sign in no internet connection | Welcome open | Disconnect network, tap Sign In | Toast: "No network connection. Check internet". | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-068** | Dashboard | Dashboard load API timeout | Logged in | Force slow API latency, open dashboard | ActivityIndicator spins, shows "Connection timeout". | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-069** | Navigation| Restricted route (Unauthorized) | Sales logged in | Manually navigate stack to Distributor edit | Alert: "Access Denied. Forbidden". | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-070** | ListScreen | Empty list placeholder fallback | Empty category | Open Category list | Screen displays: "No categories available". | Low | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-071** | Details | Convert quote fails (Duplicate convert)| Converted quote| Tap "Convert to Order" | Error popup: "Quotation already converted". | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-072** | Payment | Payment amount exceeds balance | Order open | Record payment amount > balance | Alert: "Payment amount exceeds balance due". | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-073** | Details | Order details invalid ID fallback | Cache load | Open order details with bad ID | Screen displays: "Order not found". | Medium | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-074** | Settings | Host emulator connection timeout | Dev env | Wrong API host config (`127.0.0.1:8081`)| Alert: "Network request failed". | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-075** | Quotation | Save quotation empty items | Form open | Tap Save with empty items | Warning popup: "Quotation must have items". | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-076** | Product | Fetch product catalog fails | Server down | Open Products tab | Displays retry button: "Failed to load catalog". | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-077** | Global | Session token validation failure | Session open | Inject corrupted token, refresh app | Redirects automatically to Login screen. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-078** | Global | API 500 error fallback | Any list | Trigger backend crash | Alert: "Server error. Try again later". | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-079** | Quotation | Discount input characters block | Form open | Type `abc` in discount | Blocks character entries, numeric input only. | Medium | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-080** | Customer | Duplicate phone number check | Form open | Fill duplicate phone, tap save | Error toast: "Phone number already exists". | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-081** | App | Launch on old Android build | Dev env | Open on API level 21 | Warning alert or crash log check (compatible only). | Low | Manual |
| **NEG-082** | Settings | Clear API host configurations | Settings | Remove host configuration URL | Alert: "API Endpoint Host is required". | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-083** | Details | View deleted category | List cached | Tap deleted category item | Alert: "Category does not exist". | Medium | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-084** | Purchase Order| Receive PO quantity overflow | PO open | Fill received quantity > PO items quantity| Alert: "Received quantity cannot exceed ordered quantity".| High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **NEG-085** | Distributor| Create duplicate distributor email | Form open | Fill existing email, save | Toast: "Email already registered". | Medium | `mobile/tests/e2e/mobile-smoke.spec.js` |

## 4. Database Negative Test Cases (NEG-086 to NEG-095)

| Test ID | Area | Scenario | Steps | Expected Result | Priority | Suggested Test File Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NEG-086** | Flyway | Flyway schema conflict | Run migrations on non-empty schema | Flyway fails, blocks startup to protect data. | Critical | `backend/src/test/java/com/sanitaryware/crm/FlywayMigrationTest.java` |
| **NEG-087** | Schema | Missing required tables check | Set `ddl-auto=validate` on empty DB | Application crashes on startup (validation failure). | Critical | `backend/src/test/java/com/sanitaryware/crm/HibernateValidateTest.java` |
| **NEG-088** | Type | Invalid Enum insertion | Insert raw SQL with bad status value | Database throws constraint/data truncation exception. | High | SQL client |
| **NEG-089** | FK | Cascade deletion validation | Try deleting customer with active orders | Deletion blocked by database constraints. | High | `backend/src/test/java/com/sanitaryware/crm/CustomerRepositoryTest.java` |
| **NEG-090** | Values | Negative price verification | Attempt to insert negative MRP row directly | Throws CHECK constraint violation. | High | SQL client |
| **NEG-091** | Stock | Underflow stock verification | Attempt direct decrease to negative stock | Throws CHECK constraint violation (stock cannot be < 0).| Critical | `backend/src/test/java/com/sanitaryware/crm/ProductStockLockTest.java` |
| **NEG-092** | unique | Duplicate SKU entry | Insert row with existing SKU | Throws UNIQUE constraint violation, rejects transaction. | High | `backend/src/test/java/com/sanitaryware/crm/ProductRepositoryTest.java` |
| **NEG-093** | unique | Duplicate phone registration | Insert customer with duplicate phone | Throws UNIQUE constraint violation, rejects transaction. | High | `backend/src/test/java/com/sanitaryware/crm/CustomerRepositoryTest.java` |
| **NEG-094** | Null | Required null constraints | Insert product with null brand id | Throws NULL constraint exception. | High | `backend/src/test/java/com/sanitaryware/crm/ProductRepositoryTest.java` |
| **NEG-095** | Baseline| Baseline on migrate missing | Run migrations on existing non-Flyway database | Startup crashes: "Found non-empty schema...". | Critical | `backend/src/test/java/com/sanitaryware/crm/FlywayMigrationTest.java` |

## 5. Deployment / Security Negative Test Cases (NEG-096 to NEG-100)

| Test ID | Area / Scenario | Command / Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **NEG-096** | Env | Missing JWT Secret | Start JAR without `JWT_SECRET` variable | Startup fails with security setup configuration exception. | Critical |
| **NEG-097** | Env | Missing Database credentials | Start JAR without `DATABASE_URL` variable | Context fails to load, database connection pool fails. | Critical |
| **NEG-098** | Security| CORS origin block | Access backend from unauthorized web domain | Browser blocks response headers, CORS preflight fail. | Critical |
| **NEG-099** | Security| Path Traversal on File download | GET `/api/files/download/general/../../application.properties`| Returns 400 Bad Request or sanitizes path safely. | Critical |
| **NEG-100** | Docker | Docker run without env variables | Run docker container without passing environment variables | Container starts but exits immediately with exit code 1. | High |
