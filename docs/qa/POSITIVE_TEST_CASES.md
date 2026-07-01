# POSITIVE TEST CASES

> [!NOTE]
> **Status of all test cases**: Not executed yet (Staged for local automation).

## 1. Backend / API Positive Test Cases (POS-001 to POS-035)

| Test ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Automation Tool | Suggested Test File Path | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS-001** | Auth | Register Admin User | Clean DB | POST to `/api/auth/register` with admin details | `qaadmin` DTO | 200 OK, returns user profile, role: `ADMIN`. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Critical |
| **POS-002** | Auth | Register Sales User | Admin user exists | POST to `/api/auth/register` with sales details | `qasales` DTO | 200 OK, returns user profile, role: `SALES`. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | High |
| **POS-003** | Auth | Login Admin | Admin exists | POST to `/api/auth/login` | Username: `qaadmin`, Password: `Password@123` | 200 OK, returns JWT token. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Critical |
| **POS-004** | Auth | Login Sales | Sales exists | POST to `/api/auth/login` | Username: `qasales`, Password: `Password@123` | 200 OK, returns JWT token. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Critical |
| **POS-005** | Auth | Get Profile | Logged in | GET to `/api/auth/me` with JWT | Valid JWT | 200 OK, returns profile data. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | High |
| **POS-006** | Auth | Update Profile | Logged in | PUT to `/api/auth/profile` | Profile update DTO | 200 OK, profile details updated. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java` | Medium |
| **POS-007** | Category | Create Root Category | Admin logged in | POST to `/api/categories` | Name: `Pipes` | 200 OK, category created. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | High |
| **POS-008** | Category | Create Sub-Category | Parent exists | POST to `/api/categories` with parentId | Name: `PVC`, parentId: 1 | 200 OK, sub-category created. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | High |
| **POS-009** | Category | List Categories | Categories exist | GET to `/api/categories` | None | 200 OK, returns category list. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | Medium |
| **POS-010** | Category | Get Category by ID | Category exists | GET to `/api/categories/{id}` | Category ID | 200 OK, returns category details. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | Medium |
| **POS-011** | Category | Update Category | Category exists | PUT to `/api/categories/{id}` | Category update DTO | 200 OK, category details updated. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CategoryControllerTest.java` | Medium |
| **POS-012** | Brand | Create Brand | Admin logged in | POST to `/api/brands` | Name: `Supreme` | 200 OK, brand created. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/BrandControllerTest.java` | High |
| **POS-013** | Brand | List Brands | Brands exist | GET to `/api/brands` | None | 200 OK, returns brand list. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/BrandControllerTest.java` | Medium |
| **POS-014** | Brand | Update Brand | Brand exists | PUT to `/api/brands/{id}` | Brand update DTO | 200 OK, brand details updated. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/BrandControllerTest.java` | Medium |
| **POS-015** | Product | Create Product | Brand & Category exist | POST to `/api/products` | Product DTO | 200 OK, product created. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | Critical |
| **POS-016** | Product | Update Product | Product exists | PUT to `/api/products/{id}` | Product update DTO | 200 OK, product details updated. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | High |
| **POS-017** | Product | List Products | Products exist | GET to `/api/products` | Pageable params | 200 OK, returns page of products. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | Medium |
| **POS-018** | Product | Search Products | Products exist | GET to `/api/products/search` | Query: `Supreme` | 200 OK, returns matched products. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | High |
| **POS-019** | Product | Update Stock | Product exists | PATCH to `/api/products/{id}/stock` | Qty: `50` | 200 OK, stock replenished. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | High |
| **POS-020** | Product | Get Low Stock | Low stock products exist | GET to `/api/products/low-stock` | None | 200 OK, returns low stock products. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | Medium |
| **POS-021** | Product | Get Featured | Featured products exist | GET to `/api/products/featured` | None | 200 OK, returns featured products. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java` | Low |
| **POS-022** | Customer | Create Customer | Admin logged in | POST to `/api/customers` | Customer DTO | 200 OK, customer created. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CustomerControllerTest.java` | High |
| **POS-023** | Customer | List Customers | Customers exist | GET to `/api/customers` | Pageable params | 200 OK, returns customer list. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CustomerControllerTest.java` | Medium |
| **POS-024** | Customer | Update Customer | Customer exists | PUT to `/api/customers/{id}` | Customer update DTO | 200 OK, customer updated. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/CustomerControllerTest.java` | Medium |
| **POS-025** | Distributor | Create Distributor | Admin logged in | POST to `/api/distributors` | Distributor DTO | 200 OK, distributor created. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/DistributorControllerTest.java` | High |
| **POS-026** | Distributor | List Distributors | Distributors exist | GET to `/api/distributors` | None | 200 OK, returns distributor list. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/DistributorControllerTest.java` | Medium |
| **POS-027** | Quotation | Create Quotation | Product & Customer exist | POST to `/api/quotations` | Quotation DTO | 200 OK, quotation created in `DRAFT`. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | Critical |
| **POS-028** | Quotation | Update Status to Sent | Quotation exists | PATCH to `/api/quotations/{id}/status` | Status: `SENT` | 200 OK, status updated. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | High |
| **POS-029** | Quotation | Generate Quotation PDF | Quotation exists | GET to `/api/quotations/{id}/pdf` | None | 200 OK, streams PDF bytes. | REST Assured | `backend/src/test/java/com/sanitaryware/crm/controller/QuotationControllerTest.java` | High |
| **POS-030** | Order | Convert Quotation | Accepted quotation exists | POST to `/api/orders/from-quotation/{id}` | None | 200 OK, order created, status `PENDING`. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/OrderControllerTest.java` | Critical |
| **POS-031** | Order | Generate Invoice PDF | Order exists | GET to `/api/orders/{id}/invoice/pdf` | None | 200 OK, streams PDF bytes. | REST Assured | `backend/src/test/java/com/sanitaryware/crm/controller/OrderControllerTest.java` | High |
| **POS-032** | Payment | Record Full Payment | Order exists with balance | POST to `/api/payments` | Payment DTO | 200 OK, payment saved, balance is 0. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/PaymentControllerTest.java` | Critical |
| **POS-033** | Purchase Order | Create PO | Distributor exists | POST to `/api/purchase-orders` | PO DTO | 200 OK, PO created, status `DRAFT`. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/PurchaseOrderControllerTest.java` | High |
| **POS-034** | Dashboard | Get Stats | Data exists in DB | GET to `/api/dashboard/stats` | None | 200 OK, returns stats JSON. | MockMvc | `backend/src/test/java/com/sanitaryware/crm/controller/DashboardControllerTest.java` | Low |
| **POS-035** | Health | Get Public Health | Server is running | GET to `/api/health` | None | 200 OK, returns UP status. | curl | `backend/src/test/java/com/sanitaryware/crm/controller/HealthCheckControllerTest.java` | High |

## 2. Frontend / Admin Positive Test Cases (POS-036 to POS-060)

| Test ID | Page | Scenario | Preconditions | Test Steps | Expected UI Result | Expected API Call | Priority | Automation Tool | Suggested Test File Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS-036** | Login | Sign In successfully | URL is loaded | Fill username/password, click Sign In | Navigates to dashboard, success toast shows. | `POST /api/auth/login` | Critical | Playwright | `frontend/tests/e2e/login.spec.js` |
| **POS-037** | Route | Protected route redirection | User authenticated | Navigate to `/products` path | Content renders, sidebar is active. | `GET /api/products` | High | Playwright | `frontend/tests/e2e/routing.spec.js` |
| **POS-038** | Dashboard | Stats widgets render | Dashboard page loaded | Inspect widgets values | Revenue, Orders, Products cards display real numbers. | `GET /api/dashboard/stats` | Medium | Playwright | `frontend/tests/e2e/dashboard.spec.js` |
| **POS-039** | Category | Categories list render | Categories exist | Click "Categories" button in Sidebar | List table renders categories and parent names. | `GET /api/categories` | High | Playwright | `frontend/tests/e2e/categories.spec.js` |
| **POS-040** | Category | Create category modal | Category list loaded | Click "Add Category", fill name, click save | Modal closes, category added, table refreshed. | `POST /api/categories` | High | Playwright | `frontend/tests/e2e/categories.spec.js` |
| **POS-041** | Product | Products list render | Products exist | Navigate to `/products` | Products table renders SKU, Name, MRP, Stock. | `GET /api/products` | High | Playwright | `frontend/tests/e2e/products.spec.js` |
| **POS-042** | Product | Create product form | Product form loaded | Fill name, SKU, price, select brand, click save | Redirects to list, success message shows. | `POST /api/products` | High | Playwright | `frontend/tests/e2e/products.spec.js` |
| **POS-043** | Brand | Create Brand modal | Brand list loaded | Click "Add Brand", fill name, save | Modal closes, brand added to table list. | `POST /api/brands` | Medium | Playwright | `frontend/tests/e2e/brands.spec.js` |
| **POS-044** | Customer | Create Customer form | Customer list loaded | Click "Add Customer", fill form, save | Redirects to list, customer appears in table. | `POST /api/customers` | High | Playwright | `frontend/tests/e2e/customers.spec.js` |
| **POS-045** | Distributor | Create Distributor form | Distributor list loaded | Click "Add Distributor", fill form, save | Redirects to list, distributor appears. | `POST /api/distributors` | Medium | Playwright | `frontend/tests/e2e/distributors.spec.js` |
| **POS-046** | Product | Categories button redirect | Products list loaded | Click "Categories" button | Navigates to `/categories`. | None | High | Playwright | `frontend/tests/e2e/products.spec.js` |
| **POS-047** | Quotation | Create Quotation form | New quotation loaded | Select customer, add product, enter qty, save | Redirects to list, quotation is in `DRAFT`. | `POST /api/quotations` | High | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **POS-048** | Quotation | Download Quotation PDF | Quotations list loaded | Click "Download PDF" icon button | Starts native browser download for PDF file. | `GET /api/quotations/{id}/pdf` | High | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **POS-049** | Quotation | Accept Quotation from UI | Quotation in `SENT` status | Click checkmark "Accept" button | Status badge updates to `ACCEPTED`. | `PATCH /api/quotations/{id}/status?status=ACCEPTED` | High | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **POS-050** | Quotation | Reject Quotation from UI | Quotation exists | Click "Reject" button | Status badge updates to `REJECTED`. | `PATCH /api/quotations/{id}/status?status=REJECTED` | High | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **POS-051** | Quotation | Convert to Order button | Accepted quotation exists | Click "Convert to Order" button | Navigates to order detail summary view. | `POST /api/orders/from-quotation/{id}` | High | Playwright | `frontend/tests/e2e/quotations.spec.js` |
| **POS-052** | Order | List orders | Orders exist | Navigate to `/orders` | Renders list with Order numbers, statuses. | `GET /api/orders` | Critical | Playwright | `frontend/tests/e2e/orders.spec.js` |
| **POS-053** | Order | Download Invoice PDF | Orders list loaded | Click "Download Invoice" icon button | Starts native browser download for PDF. | `GET /api/orders/{id}/invoice/pdf` | High | Playwright | `frontend/tests/e2e/orders.spec.js` |
| **POS-054** | Payment | Record Payment form | Order detail loaded | Click "Record Payment", fill amount, submit | Redirects, balance shows decreased. | `POST /api/payments` | Critical | Playwright | `frontend/tests/e2e/payments.spec.js` |
| **POS-055** | Purchase Order | Create PO | PO form loaded | Select distributor, products, save | Redirects, PO created in `DRAFT`. | `POST /api/purchase-orders` | Medium | Playwright | `frontend/tests/e2e/purchase-orders.spec.js` |
| **POS-056** | Product | Search catalog | Products list loaded | Type search term in filter box | Table filters to matched products. | `GET /api/products/search` | High | Playwright | `frontend/tests/e2e/products.spec.js` |
| **POS-057** | Global | Sidebar Navigation | Any page | Click "Customers" link on sidebar | View renders customer lists seamlessly. | `GET /api/customers` | High | Playwright | `frontend/tests/e2e/navigation.spec.js` |
| **POS-058** | Settings | View Settings | Admin logged in | Navigate to `/settings` | Displays company information fields. | `GET /api/settings` | Low | Playwright | `frontend/tests/e2e/settings.spec.js` |
| **POS-059** | Settings | Edit Settings | Settings loaded | Change phone number, click save | Success message, values updated. | `PUT /api/settings` | Low | Playwright | `frontend/tests/e2e/settings.spec.js` |
| **POS-060** | Auth | Logout | Logged in | Click Logout on profile menu | Session cleared, redirected to `/login`. | None | High | Playwright | `frontend/tests/e2e/login.spec.js` |

## 3. Mobile Positive Test Cases (POS-061 to POS-080)

| Test ID | Screen | Scenario | Preconditions | Test Steps | Expected Result | Priority | Suggested Test File Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS-061** | Welcome | App launch check | App is installed | Open the application | Splash screen displays, navigates to Login form. | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-062** | Login | Sign In mobile | Backend is running | Fill fields, tap Sign In | Access token saved in storage, navigates to Dashboard. | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-063** | Dashboard | Dashboard widgets render | Logged in | View dashboard screen | Real sales data metrics cards are displayed. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-064** | Navigation | Tab Navigation | Logged in | Tap on "Products" in bottom bar | View switches to the Products list screen. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-065** | Product | Product catalog list | Products exist | View product list | Catalog cards displaying SKUs and current stock levels render. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-066** | Customer | Customer list directory | Customers exist | Navigate to Customers tab | List displays registered customer names and phone numbers. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-067** | More | More modules view | Logged in | Tap "More" tab | Displays Categories, Brands, POs buttons directory. | Medium | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-068** | Quotation | List Quotations | Quotations exist | Tap "Quotations" under More | Renders quotation rows showing valid totals. | Medium | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-069** | Order | List Orders | Orders exist | Tap "Orders" under More | Renders orders list showing balances and statuses. | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-070** | Payment | List Payments | Payments exist | Tap "Payments" under More | Renders list showing payment method (e.g. CASH). | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-071** | Profile | View User Profile | Logged in | Tap "Profile" | Renders user full name and role status details. | Low | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-072** | Auth | Logout mobile | Logged in | Tap "Logout" on Profile | Token cleared from storage, redirects to Login. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-073** | Network | Offline cache access | Previously loaded data | Turn off network, launch app | Displays cached data, warning message offline shows. | Medium | Manual |
| **POS-074** | System | Android Emulator Host | Dev env | Boot app on Android emulator | Hits `10.0.2.2:8081` mapping successfully to local backend. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-075** | UI | Layout responsiveness | Any screen | Rotate emulator to landscape | App layouts adjusts safely to viewport changes. | Low | Manual |
| **POS-076** | Product | Select product dropdown | Quotation form open | Tap product selector | Opens list overlay, can search and select product. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-077** | Quotation | Save quotation form | Form populated | Fill John Doe, Qty 2, tap Save | Form submits, redirects to Quotation details. | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-078** | Order | Convert to order tap | Quotation details open | Tap "Convert to Order" | Confirms alert, order details summary loads. | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-079** | Payment | Record payment form | Order details open | Tap "Record Payment", fill 500, save | Submits, updates balance, Cash history shows. | Critical | `mobile/tests/e2e/mobile-smoke.spec.js` |
| **POS-080** | API | API connectivity test | Network active | Perform pull-to-refresh on list | Re-fetches fresh data from API endpoints. | High | `mobile/tests/e2e/mobile-smoke.spec.js` |

## 4. Database Positive Test Cases (POS-081 to POS-090)

| Test ID | Area | Module / Scenario | Preconditions | Test Steps | Expected Result | Automation Tool | Suggested Test File Path | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS-081** | Flyway | Flyway migrations compile | Fresh DB schema | Start app with blank MySQL database | Flyway executes `V1__Initial_Schema.sql` successfully. | Flyway | `backend/src/test/java/com/sanitaryware/crm/FlywayMigrationTest.java` | Critical |
| **POS-082** | Schema | Hibernate schema validate | Flyway ran | Start app with `ddl-auto=validate` | Context starts without any schema mismatch exceptions. | JPA Validator | `backend/src/test/java/com/sanitaryware/crm/HibernateValidateTest.java` | Critical |
| **POS-083** | FK | Category recursive key | Categories exist | Delete a parent category containing sub-categories | Throws constraint violation, protects database integrity. | JPA / SQL | `backend/src/test/java/com/sanitaryware/crm/CategoryRepositoryTest.java` | High |
| **POS-084** | Optimistic| Pessimistic Write lock | Product stock update | Run concurrent update threads on product quantity | Stock values are modified sequentially without race conditions. | JUnit | `backend/src/test/java/com/sanitaryware/crm/ProductStockLockTest.java` | Critical |
| **POS-085** | Math | Order payment balance mapping | Order total = 1000 | Record payment of 400 | `orders.balance_amount` decreases to 600. | JUnit | `backend/src/test/java/com/sanitaryware/crm/service/PaymentServiceImplTest.java` | Critical |
| **POS-086** | FK | Quotation-Order reference | Quotation exists | Convert quotation to order | `orders.quotation_id` links to original `quotations.id`. | JPA / SQL | `backend/src/test/java/com/sanitaryware/crm/service/OrderServiceImplTest.java` | High |
| **POS-087** | Stock | PO Stock addition | PO status is `ORDERED` | Transition PO status to `RECEIVED` | Product `stock_quantity` increments by PO items quantity. | JUnit | `backend/src/test/java/com/sanitaryware/crm/service/PurchaseOrderServiceImplTest.java` | High |
| **POS-088** | Soft | Soft Delete Category | Category exists | Delete Category by ID | Category `is_active` set to `false`, row remains in DB. | JPA | `backend/src/test/java/com/sanitaryware/crm/CategoryRepositoryTest.java` | Medium |
| **POS-089** | Types | Decimal scale accuracy | Products created | Verify MRP and prices columns in MySQL | Created with type `DECIMAL(10,2)` in metadata. | SQL check | `backend/src/test/java/com/sanitaryware/crm/DatabaseMetadataTest.java` | High |
| **POS-090** | Dates | Audit Timestamps | Any entity saved | Inspect `created_at` / `updated_at` | Timestamps populated automatically by Hibernate hooks. | JPA | `backend/src/test/java/com/sanitaryware/crm/AuditTest.java` | Medium |

## 5. Deployment / E2E Positive Test Cases (POS-091 to POS-100)

| Test ID | Area | Scenario | Preconditions | Test Steps | Expected Result | Automation Tool | Suggested Test File Path | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS-091** | Build | Backend compilation build | Pom configured | Run `mvn clean package -DskipTests` | Builds `crm-backend-1.0.0.jar` successfully. | Maven | `backend/pom.xml` | Critical |
| **POS-092** | Build | Frontend assets build | Package configured | Run `npm run build` inside frontend | Generates production static folder `dist/` successfully. | Vite | `frontend/package.json` | Critical |
| **POS-093** | Docker | Docker container compilation | Docker daemon active | Run `docker build -t crm-backend .` inside backend | Image compiles successfully using multi-stage tasks. | Docker | `backend/Dockerfile` | High |
| **POS-094** | Start | Backend boot verify | Local ports free | Run JAR file with H2 configurations | Server starts up listening on port `8081` safely. | Java | `backend/pom.xml` | Critical |
| **POS-095** | Health | Public Ping Check | Backend active | curl `http://localhost:8081/api/health` | Returns 200 OK with `UP` status. | curl | `backend/src/test/java/com/sanitaryware/crm/controller/HealthCheckControllerTest.java` | High |
| **POS-096** | E2E | Core Auth and Catalog setup | Clean installation | Login Admin $\rightarrow$ Create Category $\rightarrow$ Create Brand $\rightarrow$ Create Product | Product listed, accessible, and correctly cataloged. | Playwright | `frontend/tests/e2e/full-flow.spec.js` | Critical |
| **POS-097** | E2E | Complete sales conversion | Product exists | Create customer $\rightarrow$ Quotation $\rightarrow$ Convert to Order | Order created in pending, stock allocations verified. | Playwright | `frontend/tests/e2e/full-flow.spec.js` | Critical |
| **POS-098** | E2E | Payment collection | Order exists | Record cash payment for full outstanding balance | Balance becomes 0, status updates to PAID. | Playwright | `frontend/tests/e2e/full-flow.spec.js` | Critical |
| **POS-099** | E2E | Invoice print | Paid order exists | Click Download Invoice button | Invoice downloaded, values matches. | Playwright | `frontend/tests/e2e/full-flow.spec.js` | High |
| **POS-100** | E2E | Staging validation run | Deployed backend | Run Playwright E2E suite against dev/qa host | All test cases pass successfully. | Playwright | `frontend/tests/e2e/full-flow.spec.js` | Critical |
