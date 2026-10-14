# CRM Complete Master Audit Report

## 1. Executive summary

**Assessment: NOT READY FOR PRODUCTION.** The configured root verification is green, but the expanded audit uncovered financial/inventory defects, a broken native sales flow, omitted failing tests, and deployment/build blockers.

The current root run passed 14 steps, 0 failed, 0 skipped, with 413 test cases: backend 243, frontend unit 5, mobile unit 1, API 75, frontend E2E 36, mobile viewport 16, database 4, security 11, bug-hunt 22. Frontend build and mobile lint passed. The separately discovered frontend legacy E2E suite failed all seven tests after its browser prerequisite was repaired. Therefore the discovered configured-plus-legacy inventory is **420 cases: 413 passed, 7 failed**, not an entirely green repository.

Major new findings:

- Purchase-order detail returns HTTP 500 and prevents the web edit form loading.
- A ₹20 payment before receiving a ₹100 PO leaves supplier outstanding at ₹60 instead of ₹80.
- Creating a PO already RECEIVED accepts it without changing stock, then rejects receiving with 409.
- Actual Expo quotation creation loses the customer when returning from the product picker; Save displays Validation failed.
- The seven frontend legacy E2E tests are omitted from root verification.
- Native Android export fails with spawn UNKNOWN; debug assembly fails on paths longer than 260 characters.
- CI's E2E job omits the JWT secret required by QA startup.
- Nginx's static-extension location can intercept API image downloads.
- Missing files and unknown sort fields produce 500; malformed distributors are accepted.
- Cleanup can report success after errors, and shared catalogue image deletion can break retained references.
- Fresh npm audits: frontend 11 vulnerable package entries, mobile 33, automation 0.

Core web sales and catalogue modules have real APIs, services, persistence, and passing configured tests. This is a substantive implementation. It is not complete production assurance.

No application code, tests, migrations, dependency versions, or deployment configuration was edited for this audit. Existing uncommitted work was preserved. No commit, push, deployment, production database change, or real notification was performed.

## 2. Audit identity and evidence conventions

| Item | Value |
| --- | --- |
| Date | 12 October 2026; Asia/Calcutta |
| Repository | C:/Users/akhil/OneDrive/Desktop/Workspace/New folder/SanitarywareCRM |
| Branch | frontend-redesign |
| HEAD | b5ab6a5f207ec803dba72da63376214d53a08f64 |
| Tested source | HEAD plus existing dirty working tree; HEAD alone does not identify the tested build |
| Fresh root verification | 2026-10-12T15:26:29.8777450Z |
| Backend | Local disposable QA/H2 at http://localhost:8081 |
| Web portal | http://127.0.0.1:5173 |
| Actual Expo app | http://localhost:8082; explicit local API base |
| Deliverable | Repository-root CRM_COMPLETE_MASTER_AUDIT_REPORT.md |

EXECUTED means this audit performed the request, interaction, or command. STATIC means inspected current source. HISTORICAL means a prior report claims it. UNVERIFIED means this audit did not establish it. A 401 probe proves an authentication boundary, not a complete positive workflow; HTTP 200 does not prove ledger/inventory side effects.

References are repository-relative under the absolute path above. Controller filenames resolve to backend/src/main/java/com/sanitaryware/crm/controller/. Service filenames resolve to backend/src/main/java/com/sanitaryware/crm/service/. Other paths are written explicitly.

## 3. Technology stack and project structure

| Layer | Current evidence |
| --- | --- |
| Backend | Spring Boot 3.2.2, Java target 17, Maven, Spring Security/JPA, Hibernate, MySQL driver, H2, Flyway |
| Web | React 18.3.1, Axios 1.20.0, React Router DOM 6.30.6, Zustand, Lucide, react-hot-toast |
| Web tooling | Vite 5.4.21, Tailwind 3.4.19, Node built-in unit tests |
| Mobile | Expo 55.0.31, React Native 0.83.6, React 19.2.0, React Navigation 7, AsyncStorage, Axios 1.20.0 |
| Automation | Playwright 1.61.1 in automation-tests; Chromium, Pixel 5, iPhone 13/WebKit projects |
| Documents/integrations | iText 8.0.3, PDFBox 3.0.1, POI 5.2.5 dependency, Twilio 9.14.1, Spring Mail |
| Deployment | Java/Node multi-stage Dockerfiles, Nginx 1.27, MySQL 8.4 staging container, GitHub Actions |
| Audit host | Windows, Node v24.19.0; Java/Android SDK available; Docker Linux daemon unavailable |

Backend modules comprise controllers, DTOs, mappers, services, repositories, entities, validation, security, configuration, and pagination. Flyway scripts V1–V10 live under backend/src/main/resources/db/migration. Web pages/services/components live under frontend/src; native screens/navigation/API under mobile/src; automation suite under automation-tests; native Gradle project under mobile/android; operating/runbook documents at root and docs/.

Versions come from current manifests/lockfiles. Historical PostgreSQL recommendations do not match the current MySQL production driver/dialect/migrations. Historical OpenPDF descriptions do not match current iText generation.

## 4. gstack skills discovered, used, and unavailable

Installed skills were discovered under C:/Users/akhil/.codex/skills, including product/planning, engineering, review, QA, browse, design, security, investigation, health, benchmark, documentation, and shipping workflows. The requested browser candidate is named browse. The [public gstack repository](https://github.com/garrytan/gstack) was consulted; local installed instructions govern usage.

The router and qa-only instructions were read and applied. Previously read browse/QA/health/design guidance in this conversation informed current browser and verification work. This user's source-review/report requirements override qa-only's narrow prohibition on source inspection. Its no-application-fix behavior was retained.

| Skill | Actual use/status |
| --- | --- |
| gstack | Router read; selected report-only QA, live browser, source review and security audit |
| qa-only | Installed/read; adapted current report-only browser exploration, with partial control/state coverage |
| browse | Installed; real Codex In-app Browser interactions used as available driver; native gstack runtime unavailable |
| qa | Installed; repair/commit phase excluded by the user's audit-only instruction |
| review | Installed; native source/diff review; formal shell/ledger/cross-model workflow not completed |
| investigate | Installed; failure reproductions and source hypotheses; implementation excluded |
| design-review | Installed; live screenshots/DOM/responsive observations; automatic edits/commits excluded |
| health | Installed; repository tests/build/lint executed; no fabricated weighted gstack score |
| cso | Installed instructions read; trusted launcher absent, so CSO NOT ASSESSED; independent security checks below are not helper-certified |
| office-hours | Installed; formal interactive product-discovery workflow not executed; business analysis is auditor judgment |
| plan-ceo-review | Installed; formal implementation-plan review not completed; no approved plan artifact claimed |
| plan-eng-review | Installed; independent architecture review below; formal plan-review workflow not completed |
| benchmark | Installed; bounded native HTTP samples only; formal baseline/production benchmark not executed |
| document-release | Installed; this is an audit artifact, not a shipped-release documentation workflow |
| ship / land-and-deploy / canary | Installed, outside authorized scope |

A direct bash probe failed: WSL execvpe(/bin/bash) failed: No such file or directory. Aside was absent. The trusted C:/Users/akhil/.codex/skills/gstack/bin/gstack-cso-launcher or .exe was not present. The CSO skill explicitly requires “If unavailable, report not assessed”; its private snapshot/scanner/repair workflow was not bypassed. Native checks are independent evidence, not successful formal CSO execution.

These limitations leave formal gstack runtime/ledger/assurance work incomplete. A supported runtime and trusted CSO distribution are prerequisites. No skill upgrade was installed.

## 5. Functionality inventory and frontend-to-database tracing

IMPLEMENTED means real code exists with stated verification; it does not assert exhaustive testing. PARTIAL includes incomplete presentation, clients, tests, or side effects. BROKEN identifies reproduced failures. MISSING means no actual module/path discovered. No mock production REST implementations were identified; test mocks are a different matter.

| Functionality | Status | Trace and evidence |
| --- | --- | --- |
| Login, invalid login | IMPLEMENTED | LoginPage/LoginScreen → auth/login → AuthenticationManager/UserRepository/users; role logins 200, invalid 401/400, throttle 429 |
| JWT enforcement | IMPLEMENTED | API clients → JwtAuthenticationFilter → users/revoked_tokens; signature/expiry/active-user checks |
| Logout/revocation | IMPLEMENTED | auth/logout → TokenRevocationService/RevokedTokenRepository; 204 then copied-token me 401 |
| Web/mobile session restoration | IMPLEMENTED/PARTIAL assurance | sessionStorage/AsyncStorage → auth/me; storage is not proven encrypted |
| First administrator bootstrap | IMPLEMENTED; live race UNVERIFIED | RegisterPage → auth/register → UserRepository; V9 unique marker; backend tests |
| Management registration | PARTIAL user administration | ADMIN/MANAGER creation API; no user list/edit/deactivate admin module found |
| Own profile/password update | IMPLEMENTED; full password lifecycle UNVERIFIED | ProfilePage → auth/profile → users; no-op update 200, phone mapping present |
| Password recovery/MFA/refresh tokens | MISSING | No corresponding API/screens found |
| Dashboard/analytics/quick actions | IMPLEMENTED; policy OPEN | DashboardPage/DashboardScreen → dashboard/stats → DashboardServiceImpl/aggregate repositories |
| Customer create/edit | IMPLEMENTED | CustomerFormPage → customers → CustomerServiceImpl/CustomerRepository/customers; 201/200 |
| Customer list/search/type/active | IMPLEMENTED | CustomerListPage/Expo ListScreen → paged/search/type/active repository paths; GET 200 |
| Customer validation/duplicate phone/email | IMPLEMENTED selected cases | DTO/PhoneUtil/service/DB uniqueness; API negative tests; empty UI submission blocked |
| Customer deactivation/retention | IMPLEMENTED | DELETE → isActive false; fixture 204; retained-order test |
| Distributors/suppliers CRUD/toggle | PARTIAL validation | Pages → distributors → DistributorServiceImpl/DistributorRepository/distributors; valid CRUD works; invalid values accepted |
| Brands CRUD/active | IMPLEMENTED | Brand modals → brands → BrandServiceImpl/BrandRepository/brands; CRUD and list verified |
| Category hierarchy | IMPLEMENTED | Category modals → roots/subs/categories → CategoryServiceImpl/repository/categories parent FK |
| Products CRUD | IMPLEMENTED | Product forms/list → products → ProductServiceImpl/ProductRepository/products; create/edit/delete verified |
| Product search/filter/HSN/barcode | IMPLEMENTED | Catalog/selectors → ProductSpecification/repository; multi-filter/search and price negatives |
| Duplicate SKU/barcode feedback | IMPLEMENTED configured coverage | Constraints/service/UI alerts; API/frontend suite passes |
| Product purchase-price redaction | IMPLEMENTED | toResponseDto strips purchasePrice for SALES/WAREHOUSE; live JSON reads |
| GST/HSN/barcode snapshots | IMPLEMENTED/PARTIAL tax policy | Item DTOs/mappers preserve metadata; calculations use document taxPercentage |
| Inventory visibility/featured/low stock | IMPLEMENTED | products endpoints → repositories; GET 200 |
| Stock adjustment | IMPLEMENTED/PARTIAL | PATCH product/stock → ProductServiceImpl; no dedicated movement journal/reason module |
| Product image lifecycle | IMPLEMENTED locally; deployment concern | edit page → product images → repository + disk; 201/public200/delete204 |
| Catalogue PDF import | IMPLEMENTED; large fresh positive UNVERIFIED | BulkUploadModal → CatalogPdfImportService/PDFBox → products/categories/images; invalid PDF 400 |
| Catalogue batch cleanup | PARTIAL | QA/dev controller → cleanupCatalogueImports; shared image deletion risk; root cleanup success does not prove all files removed |
| Quotations create/edit/list/status | IMPLEMENTED web | Quotation pages → QuotationServiceImpl/QuotationRepository/quotations/items; POST/PUT/status verified |
| Quotation acceptance/rejection | IMPLEMENTED | status action; configured acceptance and explicit rejection |
| Quote → order conversion | IMPLEMENTED; concurrency UNVERIFIED | OrderServiceImpl copies values and sets converted; direct200 and E2E |
| Order create/edit/fulfilment | IMPLEMENTED selected cases | Order pages → OrderServiceImpl/OrderRepository/orders/items; confirmation/cancellation/stock guard |
| Quotation/invoice/PO PDFs | IMPLEMENTED | Controllers → PdfGeneratorService/iText; binary GET200 and configured download tests |
| Customer partial/full payments | IMPLEMENTED | Payment form → PaymentServiceImpl → locked order/payment repository; partial live, full/overpayment suite |
| Payment-status consistency | IMPLEMENTED selected boundary | Inconsistent PAID request400; persisted PARTIAL preserved |
| Customer payment deletion | IMPLEMENTED | delete → balance recalculation; live204 |
| PO create/update/list/detail | PARTIAL/BROKEN detail | PO pages → PurchaseOrderServiceImpl/repository; create/update/list200, detail500 |
| PO receiving/inventory | PARTIAL/BROKEN bypass | Dedicated receive works in suite; generic RECEIVED create does not apply effects |
| Supplier payment ledger | BROKEN edge case | DistributorPaymentServiceImpl → PO/distributor locks; advance + receive double subtraction |
| PO invoice attachment | PARTIAL workflow | File storage/DTO association exists; detail failure blocks related edit UI |
| Six operational/financial reports | IMPLEMENTED/PARTIAL formatting | ReportsPage → ReportServiceImpl/queries; six GET200/tabs; counts shown as currency |
| Audit logs/filtering/paging | IMPLEMENTED | AuditLogsPage → controller/specification/AuditLogRepository/audit_logs; returns entity directly |
| Company settings | IMPLEMENTED/PARTIAL validation | SettingsPage → SystemSettingsService/repository; read/save200; limited DTO constraints |
| Generic file upload/download | IMPLEMENTED/PARTIAL lifecycle | FileUploadService/disk; upload/download200, anonymous401; missing files500; generic delete absent |
| Structured Excel/CSV business import/export | MISSING workflow | POI dependency/generic uploads do not establish business export endpoints |
| Email/WhatsApp delivery | PARTIAL | NotificationServiceImpl exists; no discovered production callers of notification methods; external sends unverified |
| Expo customer/product/order/module lists | IMPLEMENTED/PARTIAL paging | Real API listServices; first50 limit; page metadata discarded |
| Expo customer → quote → picker → save | BROKEN | ProductPickerScreen pushes QuotationForm without customer context |
| Expo quote detail/order/payment screens | IMPLEMENTED source; full UI flow UNVERIFIED | Dedicated screens/API functions; scripted API lifecycle works; quote UI blocker stops manual lifecycle |
| Native CRUD/import/image/PDF parity | MISSING/PARTIAL | Most remaining modules are read-only lists |
| Offline drafts/sync and push notifications | MISSING | No complete subsystem found |
| Returns/refunds/credit notes | MISSING | No complete workflow found |
| Tenant isolation | MISSING multi-tenant feature | Current schema/services are single-business, no tenant discriminator |
| Health/operations/deployment | PARTIAL | Health/Compose/CI/runbooks exist; no production migration, restore, Docker runtime proof |

## 6. Every discovered REST endpoint and contract

There are **104 method/path mappings in 18 controllers**, including dev/qa-only catalogue cleanup. The census issued one unauthenticated request to every mapping. Authenticated reads and safe synthetic mutation checks supplement it. SALES document access also requires ownership in services.

PASS selected cases means only listed executed evidence. A mutation with only a 401 probe remains PARTIAL. Destructive global product deletion was not executed positively. All controller paths are under backend/src/main/java/com/sanitaryware/crm/controller/.

| ID | Endpoint | Required access | Actual HTTP evidence | Result | Source |
| --- | --- | --- | --- | --- | --- |
| E001 | GET `/api/audit-logs` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `AuditLogController.java:21` |
| E002 | POST `/api/auth/login` | Public | 200 roles; invalid 401/400; throttle 429 | PASS selected cases | `AuthController.java:43` |
| E003 | POST `/api/auth/register` | Initial bootstrap; then ADMIN/MANAGER | Empty body 400; valid bootstrap UNVERIFIED | PARTIAL | `AuthController.java:98` |
| E004 | POST `/api/auth/logout` | Authenticated | 204; reused token 401 | PASS selected cases | `AuthController.java:167` |
| E005 | GET `/api/auth/me` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `AuthController.java:185` |
| E006 | PUT `/api/auth/profile` | Authenticated | 200 no-op; anonymous 401 | PASS selected cases | `AuthController.java:208` |
| E007 | POST `/api/brands` | ADMIN, MANAGER | 201 valid; anonymous 401 | PASS selected cases | `BrandController.java:21` |
| E008 | PUT `/api/brands/{id}` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `BrandController.java:27` |
| E009 | GET `/api/brands/{id}` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `BrandController.java:33` |
| E010 | GET `/api/brands` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `BrandController.java:38` |
| E011 | GET `/api/brands/active` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `BrandController.java:43` |
| E012 | DELETE `/api/brands/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `BrandController.java:48` |
| E013 | POST `/api/categories` | ADMIN, MANAGER | 201 valid; anonymous 401 | PASS selected cases | `CategoryController.java:21` |
| E014 | PUT `/api/categories/{id}` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `CategoryController.java:27` |
| E015 | GET `/api/categories/{id}` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `CategoryController.java:33` |
| E016 | GET `/api/categories` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `CategoryController.java:38` |
| E017 | GET `/api/categories/active` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `CategoryController.java:43` |
| E018 | GET `/api/categories/roots` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `CategoryController.java:48` |
| E019 | GET `/api/categories/{parentId}/subs` | Authenticated | ADMIN 200; anonymous 401 | PASS selected cases | `CategoryController.java:53` |
| E020 | DELETE `/api/categories/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `CategoryController.java:58` |
| E021 | POST `/api/customers` | ADMIN, MANAGER, SALES | 201 valid; anonymous 401 | PASS selected cases | `CustomerController.java:27` |
| E022 | PUT `/api/customers/{id}` | ADMIN, MANAGER, SALES | 200 valid; anonymous 401 | PASS selected cases | `CustomerController.java:32` |
| E023 | GET `/api/customers/{id}` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `CustomerController.java:37` |
| E024 | GET `/api/customers` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `CustomerController.java:42` |
| E025 | GET `/api/customers/search` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `CustomerController.java:51` |
| E026 | DELETE `/api/customers/{id}` | ADMIN, MANAGER, SALES | 204 fixture cleanup; anonymous 401 | PASS selected cases | `CustomerController.java:61` |
| E027 | GET `/api/customers/active` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `CustomerController.java:67` |
| E028 | GET `/api/customers/type/{type}` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `CustomerController.java:72` |
| E029 | GET `/api/dashboard/stats` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `DashboardController.java:19` |
| E030 | POST `/api/distributors` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `DistributorController.java:23` |
| E031 | PUT `/api/distributors/{id}` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `DistributorController.java:29` |
| E032 | GET `/api/distributors/{id}` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `DistributorController.java:35` |
| E033 | GET `/api/distributors` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `DistributorController.java:41` |
| E034 | GET `/api/distributors/active` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `DistributorController.java:52` |
| E035 | DELETE `/api/distributors/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `DistributorController.java:58` |
| E036 | PATCH `/api/distributors/{id}/toggle-status` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `DistributorController.java:65` |
| E037 | POST `/api/distributor-payments` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `DistributorPaymentController.java:24` |
| E038 | GET `/api/distributor-payments/{id}` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `DistributorPaymentController.java:30` |
| E039 | GET `/api/distributor-payments` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `DistributorPaymentController.java:36` |
| E040 | GET `/api/distributor-payments/purchase-order/{poId}` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `DistributorPaymentController.java:46` |
| E041 | DELETE `/api/distributor-payments/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `DistributorPaymentController.java:52` |
| E042 | POST `/api/files/upload` | ADMIN, MANAGER | 200 multipart PNG; anonymous 401 | PASS selected cases | `FileUploadController.java:28` |
| E043 | GET `/api/files/download/{type}/{subType}/{fileName:.+}` | Public products; managed file authorization | Missing file 500; anon managed 401; existing nested file UNVERIFIED | FAIL | `FileUploadController.java:48` |
| E044 | GET `/api/files/download/{type}/{fileName:.+}` | Public products; managed file authorization | 200 existing file; missing file 500; anon managed 401 | FAIL | `FileUploadController.java:56` |
| E045 | GET `/api/health` | Public | 200 authenticated and anonymous | PASS selected cases | `HealthCheckController.java:18` |
| E046 | POST `/api/orders` | ADMIN, MANAGER, SALES | 200 valid; anonymous 401 | PASS selected cases | `OrderController.java:26` |
| E047 | POST `/api/orders/from-quotation/{quotationId}` | ADMIN, MANAGER, SALES | 200 conversion; anonymous 401 | PASS selected cases | `OrderController.java:32` |
| E048 | PUT `/api/orders/{id}` | ADMIN, MANAGER, SALES | 200 valid; anonymous 401 | PASS selected cases | `OrderController.java:38` |
| E049 | GET `/api/orders/{id}` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `OrderController.java:44` |
| E050 | GET `/api/orders` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `OrderController.java:50` |
| E051 | DELETE `/api/orders/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `OrderController.java:60` |
| E052 | PATCH `/api/orders/{id}/status` | ADMIN, MANAGER, SALES, WAREHOUSE | 200 CONFIRMED/CANCELLED; anon 401 | PASS selected cases | `OrderController.java:67` |
| E053 | PATCH `/api/orders/{id}/payment-status` | ADMIN, MANAGER, SALES | 400 inconsistent PAID; anon 401 | PASS selected cases | `OrderController.java:73` |
| E054 | GET `/api/orders/customer/{customerId}` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `OrderController.java:79` |
| E055 | GET `/api/orders/{id}/invoice/pdf` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `OrderController.java:85` |
| E056 | POST `/api/payments` | ADMIN, MANAGER, SALES | 200 valid; anonymous 401 | PASS selected cases | `PaymentController.java:20` |
| E057 | GET `/api/payments/{id}` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `PaymentController.java:26` |
| E058 | GET `/api/payments/order/{orderId}` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `PaymentController.java:32` |
| E059 | GET `/api/payments` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `PaymentController.java:38` |
| E060 | DELETE `/api/payments/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `PaymentController.java:44` |
| E061 | POST `/api/products` | ADMIN, MANAGER | 201 valid; anonymous 401 | PASS selected cases | `ProductController.java:30` |
| E062 | PUT `/api/products/{id}` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `ProductController.java:36` |
| E063 | GET `/api/products/{id}` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:42` |
| E064 | GET `/api/products` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:48` |
| E065 | GET `/api/products/search` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:80` |
| E066 | GET `/api/products/category/{categoryId}` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:91` |
| E067 | GET `/api/products/brand/{brandId}` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:102` |
| E068 | GET `/api/products/barcode/{barcode}` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:113` |
| E069 | GET `/api/products/hsn/{hsnCode}` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:119` |
| E070 | GET `/api/products/low-stock` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:130` |
| E071 | GET `/api/products/featured` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:136` |
| E072 | DELETE `/api/products/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `ProductController.java:142` |
| E073 | PATCH `/api/products/{id}/stock` | ADMIN, MANAGER | 200 quantity=3; anonymous 401 | PASS selected cases | `ProductController.java:149` |
| E074 | POST `/api/products/bulk-catalog-upload` | ADMIN, MANAGER | 400 invalid PDF; positive import UNVERIFIED this audit | PARTIAL | `ProductController.java:156` |
| E075 | POST `/api/products/{id}/images` | ADMIN, MANAGER | 201; public image download 200; anon upload 401 | PASS selected cases | `ProductController.java:165` |
| E076 | GET `/api/products/{id}/images` | ADMIN, MANAGER, SALES, WAREHOUSE | ADMIN 200; anonymous 401 | PASS selected cases | `ProductController.java:175` |
| E077 | DELETE `/api/products/{id}/images/{imageId}` | ADMIN, MANAGER | 204; anonymous 401 | PASS selected cases | `ProductController.java:181` |
| E078 | DELETE `/api/products/all` | ADMIN | Anonymous 401; SALES 403; valid destructive path UNVERIFIED | PARTIAL | `ProductController.java:190` |
| E079 | POST `/api/purchase-orders` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `PurchaseOrderController.java:24` |
| E080 | PUT `/api/purchase-orders/{id}` | ADMIN, MANAGER | 200 valid; anonymous 401 | PASS selected cases | `PurchaseOrderController.java:30` |
| E081 | GET `/api/purchase-orders/{id}` | ADMIN, MANAGER | 500 existing and missing IDs; anon 401 | FAIL | `PurchaseOrderController.java:36` |
| E082 | GET `/api/purchase-orders` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `PurchaseOrderController.java:42` |
| E083 | DELETE `/api/purchase-orders/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `PurchaseOrderController.java:52` |
| E084 | PATCH `/api/purchase-orders/{id}/status` | ADMIN, MANAGER | 200 ORDERED; anonymous 401 | PASS selected cases | `PurchaseOrderController.java:59` |
| E085 | POST `/api/purchase-orders/{id}/receive` | ADMIN, MANAGER | 200 receiving; duplicate/bypass 409; anon 401 | PASS selected cases | `PurchaseOrderController.java:65` |
| E086 | GET `/api/purchase-orders/distributor/{distributorId}` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `PurchaseOrderController.java:71` |
| E087 | GET `/api/purchase-orders/{id}/pdf` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `PurchaseOrderController.java:77` |
| E088 | DELETE `/api/qa/catalogue-imports` | ADMIN | 200 cleanup in QA root run; anonymous 401; prod UNVERIFIED | PARTIAL | `QaCatalogueCleanupController.java:23` |
| E089 | POST `/api/quotations` | ADMIN, MANAGER, SALES | 200 valid; anonymous 401 | PASS selected cases | `QuotationController.java:26` |
| E090 | PUT `/api/quotations/{id}` | ADMIN, MANAGER, SALES | 200 valid; anonymous 401 | PASS selected cases | `QuotationController.java:32` |
| E091 | GET `/api/quotations/{id}` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `QuotationController.java:38` |
| E092 | GET `/api/quotations` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `QuotationController.java:44` |
| E093 | DELETE `/api/quotations/{id}` | ADMIN, MANAGER | 204 fixture cleanup; anonymous 401 | PASS selected cases | `QuotationController.java:54` |
| E094 | PATCH `/api/quotations/{id}/status` | ADMIN, MANAGER, SALES | Anonymous 401; positive UNVERIFIED in census | PARTIAL | `QuotationController.java:61` |
| E095 | GET `/api/quotations/customer/{customerId}` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `QuotationController.java:67` |
| E096 | GET `/api/quotations/{id}/pdf` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `QuotationController.java:73` |
| E097 | GET `/api/reports/sales-summary` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `ReportController.java:23` |
| E098 | GET `/api/reports/customer-outstanding` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `ReportController.java:33` |
| E099 | GET `/api/reports/distributor-outstanding` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `ReportController.java:40` |
| E100 | GET `/api/reports/payment-summary` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `ReportController.java:47` |
| E101 | GET `/api/reports/purchase-summary` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `ReportController.java:56` |
| E102 | GET `/api/reports/inventory-summary` | ADMIN, MANAGER | ADMIN 200; anonymous 401 | PASS selected cases | `ReportController.java:66` |
| E103 | GET `/api/settings` | ADMIN, MANAGER, SALES | ADMIN 200; anonymous 401 | PASS selected cases | `SystemSettingsController.java:17` |
| E104 | PUT `/api/settings` | ADMIN, MANAGER | 200 no-op save; anonymous 401; SALES 403 suite | PASS selected cases | `SystemSettingsController.java:23` |

Selected 200 responses still have failing invariants: POST purchase-orders with status RECEIVED (F17), pre-receipt distributor-payments (F02), and malformed distributors (F06). The endpoint table records observed transport cases, not an all-scenario pass.

| API group | Request/response contract |
| --- | --- |
| Auth | JSON login username/password → AuthResponse token/id/username/email/fullName/phoneNumber/role; register validated identity/password/role → MessageResponse; me/profile → identity DTO; logout bearer →204 |
| Brand/category | BrandDTO/CategoryDTO, parentId hierarchy; create201, detail/update DTO, list arrays, delete204 |
| Customer | Validated name/phone/type and optional email/GST/address; create201; detail/update200; page/size/sort, query search; active array |
| Distributor | Name/contact/email/phone/address/GST/banking/balance/status DTO; create/update200; paged list/search; active array; toggle DTO; missing bean validation |
| Product | SKU/name/category/brand/prices/stock/unit/GST/barcode/HSN DTO; create201/detail200/paged filters; quantity stock query; images multipart file/isPrimary/displayOrder →201 DTO |
| Catalogue | Multipart brandId/file/optional batchId → count/warning/batch summary; parser is layout-dependent |
| Quotation/order | customerId/date/items(productId/quantity/unitPrice/discount) and optional headers/metadata → DTO200; paged list; status query; conversion POST → OrderDTO |
| Customer payment | orderId/date/amount/method/reference/notes → payment DTO200; detail/list/order arrays; delete204 |
| PO | distributorId/orderDate/status/tax/items(quantity/unitCost/receivedQuantity) →DTO; list Page; receive/status actions; PDF bytes |
| Supplier payment | purchaseOrderId or distributorId, amount/date/method/reference/notes →DTO200, list Page, by-PO arrays, delete204 |
| Files | Multipart file/type → fileName/downloadURI/MIME/size map; download Resource with MIME/disposition |
| Reports | Optional dates/status/active/low-stock as declared → ReportDTO metrics and row collections |
| Audit | Actor/action/entity/entityId/date filter plus paging → Page of AuditLog entity |
| Settings | Company/contact/address/tax/currency/logo DTO; read200 and update200 |
| Health/QA | Public status/database object; ADMIN dev/qa cleanup returns deactivatedProducts |

Every mutation must be judged by persisted results, not only response codes. Derived totals are service-owned. Mixed creation status codes are consistency debt, not a functional defect by themselves.

## 7. Frontend and mobile review

Current App.jsx routes include public login/register; dashboard/profile; customer list/new/edit; product list/new/edit; brands/categories; quotation list/new/edit; order list/new/edit; payment list/new; distributor list/new/edit; PO list/new/edit; supplier-payment list/new/edit; reports/audit/settings; root redirect and not-found wildcard.

| Fresh manual page | Result |
| --- | --- |
| Dashboard | Greeting, widgets, analytics and quick actions render |
| Customers | Directory renders; required blank create submission blocked |
| Brands/Categories | Correct headings/list/actions; full CRUD chiefly automated/API |
| Products | Catalogue and nine filters render; responsive samples have no overflow |
| Distributors | List renders; API accepts invalid values |
| Purchase Orders | List renders; Edit for fixture22 starts load then redirects to list |
| Distributor Payments | List renders; PO detail dependency and ledger issue remain |
| Quotations/Orders/Payments | Lists render; configured real lifecycle tests green |
| Reports | Six tabs clicked and headings verified; counts wrongly formatted as money |
| Audit Logs | Correct heading/filter controls; restricted API reads |
| Settings | System Settings/company/contact/address render after normal async wait |
| Profile | Profile and password fields render; no password change submitted |

All 15 principal protected pages were visited at 1366×768. Dashboard/products/reports were also visited at 1920×1080, 393×851 and 390×844. No horizontal document overflow or broken loaded images in those samples. Mobile-sized Chromium checks are not iOS hardware tests; root iPhone tests use Playwright WebKit.

Fresh role sessions: ADMIN and MANAGER authenticate and see management/purchasing links; SALES sees customer/quote/order/payment/catalogue; WAREHOUSE sees dashboard/orders/products. Manager Settings renders; SALES/WAREHOUSE direct Settings shows Access denied. Role sweep console error-level capture was empty. This does not prove no failed HTTP request.

Accessibility: observed a>button counts included customers50, products23, orders24. Nested interactive controls remain even where role selectors fix test ambiguity. Report dates lack associated labels; ordinary buttons use aria-selected without full tab semantics. Exhaustive keyboard/screen-reader coverage is unverified.

Actual Expo app was tested separately at8082. Login, customer search/detail, Create Quotation, product picker, and save were operated. Customer subtitle disappeared after product selection; Save displayed Validation failed. Native ListScreen has only first50 records and no paging. Server search finds later customers/products, but most module lists lack search.

Actual Expo smoke script: API lifecycle PASS; login PASS; phase1 UI BLOCKED finding its newly seeded customer outside first50. All ten generic module navigation checks passed. Manual search found that customer, then exposed a distinct picker-return defect. Native-device behavior, secure storage, camera/documents and signed release are unverified.

## 8. Database review

Domain tables: users, categories, brands, products, product_images, customers, quotations, quotation_items, orders, order_items, payments, distributors, purchase_orders, purchase_order_items, distributor_payments, system_settings, audit_logs and revoked_tokens.

| Migration | Purpose |
| --- | --- |
| V1 | Core schema, foreign keys and unique identifiers/document numbers |
| V2 | Customer phone normalization, uniqueness and digits check |
| V3 | Product barcode/HSN/GST and unique barcode |
| V4 | HSN/active-product and image product/display-order indexes |
| V5 | PO item barcode/HSN/GST snapshots |
| V6 | Quotation/order item tax/barcode/HSN snapshots |
| V7 | Audit table/entity/date indexes |
| V8 | Durable revoked tokens and expiry index |
| V9 | Unique initial-admin marker |
| V10 | Product catalogue import batch identifier |

Production uses MySQL, Flyway and ddl-auto=validate. QA uses H2 and ddl-auto=create-drop. Two “database” Playwright specs only call health and assert UP; they do not inspect Flyway history/MySQL schemas. The balance consistency spec conditionally asserts only when order1 GET succeeds. Customer soft-deletion/retained order is a real data scenario.

Strengths: FK and unique constraints, Product @Version, explicit pessimistic locks, BigDecimal calculations, persisted revocation. Defects/gaps: locked PO read lacks transaction; generic status bypasses receipt; supplier balances misrecognize prepayments; shared-file references not safe; conversion concurrency not proven.

Current V4 does not have the composite indexes named by an old performance report. SQL does not enforce every price/balance/state/inventory rule. Real disposable MySQL clean install/upgrade/history/constraint tests remain required. Do not modify applied migrations.

## 9. Security review

Independent source/live review; formal CSO unavailable. No penetration-testing completeness/certification claimed.

Executed: Warehouse customer403; SALES/WAREHOUSE purchasePrice absent; SALES distributor/audit403; management file200/anonymous401; product image anonymous200; logout204 then old-token401; five invalid logins401 then sixth429; invalid PDF400; inconsistent order PAID400.

| Domain | Current judgment |
| --- | --- |
| Authentication | BCrypt, signature/expiry/active-user and database revocation checks present |
| Registration | Bootstrap and role restrictions implemented; current fresh-MySQL race unverified |
| Revocation | Database-backed, superseding old in-memory-only concern; cluster/restart testing unverified |
| Throttle | Live selected limit works; process-local map/global expiry/cluster concerns |
| Uploads | UUID filenames; extension/MIME/signature/10MiB limit and normalized-root checks |
| Downloads | Product images public by code policy; managed assets use role/association checks |
| CSP | Declared in Nginx including frame-ancestors; actual production response not tested |
| Client token storage | sessionStorage/AsyncStorage; AsyncStorage is not established encrypted storage |
| QA defaults | Automation requires env, but mobile/scripts/ui-smoke-test.mjs:6 still has a default password; value omitted |
| Warehouse finance | API returns revenue/payables/receivables/monthly financial fields; approved policy unresolved |
| CORS | Explicit origin configuration and selected automated checks |
| SQL/XSS | Parameterized JPA and React escaping observed; no exhaustive attack campaign |
| Audit | Management-restricted; entity exposed directly; immutable DB permissions not established |
| Dependencies | Fresh npm advisories nonzero; exact function exploitability not established |
| JVM supply chain | Manifest inventoried; no qualified JVM scanner, therefore no zero-advisory claim |

Tracked env files discovered are examples. This report includes no secrets or raw login response/token. Generic sanitized 500 responses still represent incorrect failure classification for missing files/sort.

## 10. Architecture and system design

Client → centralized Axios → JWT/method security → controller/DTO → service/transaction → mapper/repository → DB; file storage is a parallel managed disk path. A modular monolith suits the current single-store business.

Strengths: separate domains, ownership checks for SALES documents, server-side role enforcement, monetary domain logic, stock locks, migrations, durable revocation, common UI/state components and lazy-loaded larger web routes.

Weaknesses: some mappers fetch entities and accept command/status fields; field injection alongside constructor injection; generic updates compete with action endpoints; one DTO mixes requests/derived responses; report metrics lack units; native list helpers discard pagination. These are concrete boundaries explaining defects without requiring a microservice rewrite.

Purchasing needs one transaction-owned receiving path for status, stock and payable effects. Reads must not take inappropriate write locks. Native draft state must survive navigation without pushing a new form. File deletion needs ownership/reference-aware semantics.

## 11. Automated execution results

Fresh root summary: reports/verification-summary.json, generated 2026-10-12T15:26:29.8777450Z.

| Suite | Passed | Failed | Skipped | Result |
| --- | ---: | ---: | ---: | --- |
| Backend Maven | 243 | 0 | 0 | BUILD SUCCESS |
| Frontend unit | 5 | 0 | 0 | Pass |
| Mobile unit | 1 | 0 | 0 | Pass |
| API | 75 | 0 | 0 | Pass |
| Configured frontend E2E | 36 | 0 | 0 | Chromium pass |
| Pixel5 web viewport | 8 | 0 | 0 | Pass |
| iPhone13 web viewport | 8 | 0 | 0 | WebKit pass |
| Database named suite | 4 | 0 | 0 | Depth limits in section8 |
| Security | 11 | 0 | 0 | Selected scenarios pass |
| Bug-hunt | 22 | 0 | 0 | Pass |
| Root inventory total | 413 | 0 | 0 | 14 root steps pass |
| Separately discovered frontend legacy E2E | 0 | 7 | 0 | Fail |
| Distinct root+legacy inventory | 413 | 7 | 0 | 420 cases |

Other executed checks are not added to test-case counts:

- Frontend build and mobile lint passed.
- Native smoke overall exited1: phase1 API PASS; login PASS; phase1 UI BLOCKED; all ten generic module navigation checks PASS.
- Expo Android export exited1 after2691 modules: Failed to generate Hermes bytecode ... Error: spawn UNKNOWN.
- Direct Hermes executable -version process exited0. The export error's cause remains unresolved; do not call it an established antivirus block.
- Android debug exited1 in4m28s: two native build failures with Filename longer than260 characters.
- Android release exited1 in5m6s: native react-native-screens build failed with manifest 'build.ninja' still dirty after100 tries. 234 actionable tasks. This is distinct from the debug error.
- Frontend audit exited1:11 entries,6 high/5 moderate.
- Mobile audit exited1:33 entries,22 high/11 moderate.
- Automation audit exited0:0 entries.
- Docker info failed: dockerDesktopLinuxEngine named pipe not found.
- Git diff --check exited0.

Gradle SKIPPED/NO-SOURCE/UP-TO-DATE are build-task statuses, not skipped application tests. No tests were edited/disabled.

Root verification does not cover legacy web E2E, actual Expo UI smoke, native export/debug/release, npm audits, or actual MySQL migration validation. These omissions explain how a14/14 root result can coexist with release blockers.

### Legacy frontend failure detail

The initial seven tests could not launch because chromium_headless_shell-1243 was absent. The matching Chromium revision was installed in the user browser cache with npm exec --no -- playwright install chromium. No dependency manifest changed. The authenticated rerun reached the application and failed all seven:

| Flow | Executed failure | full-flow.spec.js line |
| --- | --- | --- |
| Authentication | Expects Dashboard in h1; actual Hello, QA Admin User | 19 |
| Category CRUD | Old button.btn-edit does not resolve | 44 |
| Product CRUD | Fixed E2E-TEST-SKU row unavailable; conflict/fixture assumptions | 73 |
| Customer CRUD | Fixed Ramesh Sharma row unavailable; dependent state | 95 |
| Quote conversion | Old Create Quotation button never found | 115 |
| Payment capture | Modified customer row/a.btn-manage never found | 146 |
| Invoice download | Dependent row/button.btn-download-pdf never found | 169–170 |

These are stale test contracts/fixture issues requiring repair, not authorization to delete or weaken tests. The new automation-tests frontend suite passes36 scenarios, but does not make the older suite pass.

## 12. Manual and end-to-end test results

Fresh portal interactions: login,15 protected principal pages, blank required customer submission, six report tabs, four role sessions, direct Settings access, PO edit attempt, and responsive samples.

Actual Expo interactions: login, customer server search/detail, Create Quotation, product picker and Save. Save failed after customer context disappeared. These are real UI operations against the real API. No real-device pass is claimed.

Custom endpoint census executed185 requests, with4 HTTP500 responses initially (two missing-file routes,PO detail,unknown sort) and0 network errors. It included unauthenticated cases for all104 mappings. The initial order-payment-history URL contained an unresolved orderId placeholder and returned400; corrected GET /api/payments/order/18 returned200. The placeholder was a harness error.

A32-request CRUD extension had a distributor fixture without its required persisted phone, causing409 and dependent undefined-ID cases. Those are not positive passes. A corrected10-request supplier/PO/payment lifecycle supplied a unique phone and passed all valid operations/cleanup. Brand/category/customer/product/quotation/order/payment create/update/delete/status scenarios also ran successfully.

Product image lifecycle: upload201, anonymous download200 image/png, delete204. Generic file: upload200,management download200,anonymous401. Invalid catalogue PDF400. Settings unchanged-save200. Logout204/reused-token401. Invalid login sequence401 five times then429. Negative page/oversize400 and inconsistent PAID400.

This audit does not claim exhaustive role×feature×endpoint×state permutations, every button/icon/keyboard interaction, every positive mutation, or all loading/error states. Source inspection is separately labeled. Large positive catalogue import is historical, not rerun in this audit; fresh malformed-PDF negative and cleanup command were executed.

## 13. Business workflow analysis

| Workflow | Assessment |
| --- | --- |
| Customer → web quote → acceptance → order → invoice → payment | Configured real E2E/API pass |
| Customer → Expo quote → picker → save | Blocked by lost context |
| PO draft → ordered → receive | Main configured path passes; detail and alternate status paths fail |
| PO prepayment → receiving → supplier ledger | Incorrect60 instead of80 |
| Product images/catalogue | Local lifecycle works; production Nginx/shared-delete gaps |
| Warehouse fulfilment | Role UI/API selected checks pass; finance policy needs decision |
| Customer/supplier refunds/returns | No complete workflow discovered |
| Transactional notifications | Methods exist; caller/delivery not established |

Current OrderServiceImpl permits draft quotation conversion unless rejected/converted. Do not impose accepted-only behavior without an approved product rule. GST snapshots exist, but totals apply a document taxPercentage; mixed-line GST requires a clear financial specification before changes.

## 14. Historical report reconciliation

Prior test totals are historical assertions, not fresh evidence and not added to current counts.

| Document/group | Disposition |
| --- | --- |
| docs/gstack-project-review-2026-10-11.md | Overall readiness SUPERSEDED; configured selector/RBAC fixes rechecked; audits STILL OPEN |
| docs/qa-full-report-2026-10-11.md | Configured413 case scope freshly green; completeness conclusions SUPERSEDED |
| docs/manual-complete-functional-qa-2026-10-12.md | Routes/roles partly freshly verified; exhaustive mutations/all role/file states UNVERIFIED; large PDF evidence HISTORICAL |
| docs/qa/FULL_STACK_BUG_HUNT_REPORT.md | Selected auth/data fixes RESOLVED; real DB gap STILL OPEN; sort-property variant STILL OPEN |
| docs/qa/BUG_FIX_VERIFICATION_REPORT.md | Old80/100/21 totals SUPERSEDED; old claims of all invalid sorting fixed incomplete |
| docs/qa/SECURITY_REMEDIATION_REPORT.md | S01/S02/S03 selected protections retained; in-memory revocation SUPERSEDED by DB/V8; throttle now executed; finance policy OPEN |
| PHASE12_PRODUCTION_AUDIT.md | Production readiness SUPERSEDED; manager policy/V4 index/PostgreSQL/default claims conflict with current code |
| PHASE12_COMPLETION_REPORT.md | Prior completion HISTORICAL |
| PHASE13_PRODUCTION_VALIDATION_REPORT.md | Go-live approval SUPERSEDED;100% infrastructure/invariant claim contradicted; OpenPDF/PostgreSQL descriptions stale |
| PHASE13_SECURITY_AUDIT.md | Broad penetration PASS claims UNVERIFIED; selected controls rechecked; manager settings policy inaccurate |
| PHASE13_PERFORMANCE_REPORT.md | Concurrency and numerical latencies UNVERIFIED for current build; /api/dashboard and /orders/id/confirm not actual current routes; describedV4 composite indexes absent |
| PHASE13_ROLLBACK_REPORT.md | Rollback/restore execution UNVERIFIED; procedures alone not evidence |
| PHASE12/PHASE13/PRODUCTION release and go-live checklists | Planning/checklist references; PASS boxes not current proof |
| DATABASE_PRODUCTION_RUNBOOK.md / DISASTER_RECOVERY_PLAN.md / PRODUCTION_RUNBOOK.md / PRODUCTION_DEPLOYMENT_GUIDE.md | Procedures/objectives; no fresh restore/backup/deployment run |
| docs/qa API/FRONTEND/MOBILE/POSITIVE/NEGATIVE/AUTOMATION test-case documents | Designs, not executable-pass counts |
| automation-tests backend/frontend/mobile TEST_CASES.md | Plans, distinct from discovered executable inventory |
| docs/superpowers specs/plans | Product/design intent; not proof of all shipped native flows |
| docs/frontend-redesign-analysis.md | Design context, current layout independently inspected |
| README.md / TESTING.md / mobile/README.md | Setup/scope sources; timestamps older than current run; mobile README understates implemented forms/details |

Earlier WebKit Application Control failure is SUPERSEDED for this current configured run:8/8 iPhone tests pass. Android export spawn UNKNOWN is a separate failure. No recurrence of the WebKit block was established.

## 15. Performance and scalability assessment

Ten sequential local read requests per endpoint, fully consumed, concurrency1,QA/H2 while native tools active. p95 is the largest observation for10 samples. This is a bounded diagnostic, not production load or capacity evidence.

| Endpoint | p50ms | p95/maxms | minms | HTTP |
| --- | ---: | ---: | ---: | --- |
| /api/health | 32 | 166 | 21 | 200 |
| /api/products?size=20 | 166 | 324 | 78 | 200 |
| /api/customers?size=20 | 33 | 101 | 20 | 200 |
| /api/dashboard/stats | 91 | 258 | 59 | 200 |
| /api/audit-logs?size=20 | 26 | 108 | 20 | 200 |

Scale leads: unpaged payment/active collections, broad report queries, lazy DTO relationship fetches, synchronous PDF byte/image processing, revocation DB query per token, process-local throttle. These are source risks, not measured production bottlenecks.

No current production50-user test,p99,Core Web Vitals,MySQL EXPLAIN,memory soak,failover,or multi-node benchmark. Historical performance numbers were not reused.

## 16. CI/CD and deployment review

CI builds/tests backend/web, runs API/database/security/bug-hunt/frontend/iPhone, and mobile lint/unit/export.

Confirmed source gap: E2E job sets QA passwords but not JWT_SECRET, which QA properties require. It uses fixed sleeps instead of health readiness; omits seed/cleanup and Pixel5; excludes legacy frontend and actual Expo smoke/native assembly; no audit or actual MySQL migration release gate. Root workflow is PowerShell while Linux CI has different scope. No remote CI execution was performed.

Nginx has location /api/ as an ordinary prefix and a regex extension location for PNG/JPG/JS/etc. Per [official Nginx location selection](https://nginx.org/en/docs/http/ngx_http_core_module.html#location), the regex can override the prefix. Thus API product image download paths can hit try_files rather than the proxy. Supported static finding; Docker unavailable prevented runtime reproduction.

The asset location declares its own add_header Cache-Control. Nginx1.27 [header inheritance](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header) means the parent CSP/security add_header set is not inherited there. Verify headers for HTML/assets/errors/proxied responses.

Backend non-root image is positive, but upload-volume ownership/writability requires a clean container boot test. Vercel config has only catch-all frontend rewrite; separate API mapping/header policy is unverified. No deployment was attempted.

## 17. Findings register, reproduction and acceptance criteria

P0 means immediate financial/inventory release priority; P1 a release/major workflow or assurance blocker; P2 validation/UX/security improvement; P3 maintainability/product extension. Evidence/confidence are separate from priority.

| ID | Priority/severity | Evidence | Issue |
| --- | --- | --- | --- |
| F01 | P1 major | Executed + static | PO detail500/edit blocked |
| F02 | P0 financial integrity | Executed + static | Prepayment double subtraction |
| F03 | P1 native workflow blocker | Manual + static + primary docs | Picker loses customer/draft context |
| F04 | P1 CI blocker | Static | Required JWT secret missing |
| F05 | P1 production catalogue | Static + primary docs | Nginx extension regex intercepts API images |
| F06 | P2 validation | Executed twice + static | Blank/invalid distributor accepted |
| F07 | P2 incorrect errors | Executed twice + static | Missing file500 |
| F08 | P2 API validation | Executed twice + static | Invalid sort property500 |
| F09 | P1 test trust | Static | Cleanup errors exit0 |
| F10 | P2 credential/config | Static | Mobile smoke default QA password |
| F11 | P2 accessibility | Manual DOM + static | Nested interactive controls/report labels/tabs |
| F12 | P2 presentation | Manual screenshot + static | Counts formatted as rupees |
| F13 | P2 mobile/test reliability | Script/manual + static | First50 truncation/fragile smoke fixture |
| F14 | P1 verification gap | Executed | Seven omitted legacy E2E failures |
| F15 | P1 native environment | Executed | Android export spawn UNKNOWN |
| F16 | P1 native environment | Executed | Debug long paths/release dirty Ninja manifest |
| F17 | P0/P1 inventory integrity | Executed + static | RECEIVED creation bypasses stock effects |
| F18 | P1 file integrity | Supported static | Shared image deleted despite retained references |
| F19 | P1 production assurance | Static + environment | Health checks mislabeled as MySQL/Flyway validation |
| F20 | P1/P2 supply chain | Fresh npm audits |11 frontend/33 mobile entries |
| R01 | P2 policy | Executed | Warehouse broad finance fields |
| R02 | P2 resource/cluster risk | Static | Throttle map lacks global expiry sweep |
| R03 | P2 concurrency risk | Static; runtime UNVERIFIED | Quote conversion no observed lock/unique relationship |
| R04 | P2 deployment risk | Static; runtime UNVERIFIED | Upload volume ownership |
| R05 | P2 compatibility | Expo tool warning | RN0.83.6 installed; Expo expects0.83.10 |

### F01: Purchase-order detail lock

ADMIN GET /api/purchase-orders/22 returns sanitized500; repeat and missing999999 also500. Click audit fixture Edit PO → Loading PO → purchase-orders list. PurchaseOrderServiceImpl.java:141–144 calls findByIdForUpdate outside a transaction; PurchaseOrderRepository.java:20–22 is a PESSIMISTIC_WRITE query. Source-supported root hypothesis is missing transaction for that lock; stack exception should be captured during repair. Use a normal read or correct bounded transaction. Acceptance: existing200/missing404, edit form loads, real JPA integration test.

### F02: Supplier outstanding counted incorrectly

Unique supplier starts0; PO total100; payment20 before receiving; receive. PO balance80, supplier outstanding60. DistributorPaymentServiceImpl.java:81 subtracts20 before payable recognition; PurchaseOrderServiceImpl.java:256–257 adds remaining80, so -20+80=60. Define advances versus recognized payable; each amount counted once. Acceptance: prepay/receive and receive/pay both yield80; payment deletion/cancellation/concurrency reconcile.

### F03: Actual Expo quotation creation

Customer Details → Create Quotation → Product → E2E Automated Pipe → Save. Customer label disappears after picker; Validation failed displays. ProductPickerScreen.js:84–88 navigates to QuotationForm with only selectedProduct; QuotationFormScreen.js:38–43 initializes customerId from params. React Navigation7 pushes rather than returns to an existing screen; see [official upgrade guide](https://reactnavigation.org/docs/upgrading-from-6.x/#the-navigate-method-no-longer-goes-back-use-popto-instead). Use appropriate return/popTo semantics and preserve draft/customer; validate customerId. Acceptance: repeated picker trips retain fields and quote→order→payment passes in actual Expo and device tests.

### F04: CI startup prerequisite

.github/workflows/ci.yml:84–119 supplies four QA passwords and starts QA JAR but no JWT_SECRET; application-qa.properties:12 requires it. Add nonproduction secret generation/injection, validation and readiness. Acceptance: clean Linux job starts,health/seeds/tests/cleanup run,both mobile projects and missing-variable failure checked.

### F05: Nginx file routing/header inheritance

frontend/nginx.conf:18–34 ordinary API prefix competes with static-extension regex. Protect API prefix, preserve authorization and apply intended headers. Acceptance: product PNG200 through Nginx,managed anonymous401/owner200,CSP/security headers on response classes. Static-supported; no live Nginx proof.

### F06: Distributor validation

POST name whitespace,email invalid,phone letters →200 and values retained; repeated after blank-name case. DistributorController.java:23 lacks @Valid; DistributorDTO.java:14–33 has no validation; DistributorServiceImpl.java:28–30 persists. Add API/service constraints. Acceptance: malformed/blank400/no record,valid roles and CRUD work.

### F07: Missing download status

GET /api/files/download/products/missing.png and nested missing path →500 repeatedly. FileUploadServiceImpl.java:181–194 throws generic RuntimeException for missing bytes. Use safe ResourceNotFoundException. Acceptance: missing404,path invalid400/403,real file200,no leaked paths.

### F08: Sort validation

GET /api/customers?sort=nonexistent →500 repeatedly; negative page/oversize correctly400. PaginationFactory.java:27–59 validates syntax/direction,not legal entity properties. Allowlist per-resource fields. Acceptance: unknown property400 on each paged resource,valid sort preserved.

### F09: Cleanup truth/lifecycle

automation-tests/scripts/cleanup-test-data.js:26 and105 swallow delete/final errors and exit0. Cleanup only takes explicit customer/category IDs plus batch-tagged products; most fixture IDs are unregistered. Acceptance: genuine cleanup failure nonzero,owned fixtures tracked,byte/DB checks prove outcome,unrelated data retained. Repeated idempotent absence must be explicit.

### F10: Remaining password fallback

mobile/scripts/ui-smoke-test.mjs:6 has a hardcoded fallback. Value intentionally not reproduced. Require env consistently. Acceptance: missing QA_PASSWORD fails before requests; current script/fixture scan has no default credentials.

### F11: Semantic controls

Live DOM has dozens of a>button pairs; role-based test selection does not repair invalid nesting. Report date labels lack linked inputs; aria-selected is applied without proper tab semantics. Acceptance: one interactive element/action,accessible names,proper labels/tab model,keyboard/focus checks.

### F12: Counts shown as money

Mobile-sized Sales Summary showed Total Orders ₹25. ReportsPage.jsx:145 treats all numeric metrics as currency. Use explicit units/metric type. Acceptance: counts integers,money currency,percentage/date formatting on all six reports.

### F13: Native pagination and smoke fixtures

mobile/src/api/services.js:71,97,110,135,148,161,211–215 uses size50 and drops metadata; ListScreen.js lacks load-more. Customers/products server search is a workaround; other modules cannot reach later records. Smoke failed to find its seeded customer without search. Acceptance: >50 records reachable per module; deterministic owned fixture selected by ID/query.

### F14: Omitted failing tests

frontend/tests/e2e/full-flow.spec.js fails7/7; root scripts only run automation-tests frontend/specs. Keep tests; update stale contract selectors and isolate data. Acceptance: inventories included in root/CI and all seven pass without disabling/weaker assertions.

### F15/F16: Native build blockers

Export:2691 modules then Hermes spawn UNKNOWN. Direct Hermes-version0 means its cause is not established as a Windows policy block. Debug: native headers exceed260-char paths; release: build.ninja dirty after100 tries. Use shorter supported workspace/cache paths or Linux, investigate native export child spawn/tool versions,align compatible Expo/RN patches. Acceptance: clean export/debug/release,artifact inspection and actual device smoke; do not disable OS security.

### F17: Received-state bypass

POST PO status RECEIVED,product59 quantity2/cost50:200,RECEIVED,stock105 stays105 (expected107); receive then409. PurchaseOrderMapper.java:75–83 assigns DTO status; create service does not invoke receipt effects. Gate generic status/create/update and centralize receiving transaction. Acceptance: initial RECEIVED rejected or correct effects once; equivalent PUT bypass test; normal receiving/duplicates/cancel transitions.

### F18: Shared catalogue image deletion

CatalogPdfImportService.java:114–166 shares one image URL across variants, including existing products without images. ProductServiceImpl.java:287–299 and350–372 deletes bytes for one product without querying remaining references. Existing+new family variants can retain a broken image after cleanup; individual deletion can break siblings. Static-supported, fresh mixed-variant reproduction UNVERIFIED. Acceptance: existing product/image bytes preserved,new products deactivated,sibling references survive deletion; ownership/refcount-safe cleanup.

### F19: Database test naming

flyway-migration.spec.js:6–12 and schema-validation.spec.js:6–13 assert only health; QA Hibernate creates schema. Acceptance: disposable MySQL V1–V10 fresh/upgrade execution,Flyway history/constraints/ddl-auto validation,not health-only claims.

### F20: Dependencies

Fresh audits show11 frontend/33 mobile vulnerable entries; these are propagated package effects,not44 independently proven CRM exploits. Compatible plan in section20. No force fix or major upgrade applied.

## 18. Missing and incomplete functionality

Missing discovered capabilities: full user management,password recovery/MFA,tenant isolation,stock journal/reasoned adjustments,returns/refunds/credit notes,structured Excel/CSV business export/import,offline native drafts/sync,push notifications,native file/catalogue/PDF parity,and independently tested operational restore/monitoring.

Partial: notification services without callers; generic file deletion/association cleanup; mixed-GST policy; finance role policy; arbitrary PDF layouts/cross-brand SKU behavior; mobile pagination; CI/MySQL/production assurance.

These gaps are inventory findings,not requirements that every shop must adopt. Confirm business need before expansion.

## 19. Production readiness scorecard

Qualitative auditor judgment; not a fabricated weighted gstack/security score.

| Area | Readiness | Basis |
| --- | --- | --- |
| Core web sales | CONDITIONAL | Configured main flows pass;legacy/edge gaps |
| Purchasing/accounting | BLOCKED | Detail,prepayment,state bypass |
| Native sales/build | BLOCKED | Picker/export/debug/release |
| Authorization | CONDITIONAL | Selected controls proven;broader policy/matrix open |
| Dependencies | BLOCKED pending remediation/accepted risk | High entries remain |
| Production DB | UNVERIFIED | No actual MySQL migration |
| Deployment | BLOCKED/UNVERIFIED | CI prerequisite/Nginx/Docker |
| Verification trust | CONDITIONAL | Omitted inventories/cleanup |
| Operations/recovery | UNVERIFIED | Procedures,not drills |

Hold production release. Covered web sales paths are locally usable; that does not validate purchasing/native/deployment as a complete system.

## 20. Technical debt and compatible dependency plan

| Group | Upgrade/remediation plan | Risk and checks |
| --- | --- | --- |
| Tailwind/braces/PostCSS | Explore supported patch-chain;separate approved Tailwind4 migration if necessary | CSS/plugins/design tokens;full visual/build matrix |
| Vite/esbuild/editor | Plan supported Vite/plugin/Node migration;npm suggests8.3.4 | Proxy/env/assets/bundles/Windows/dev-server checks |
| React Router6 | Trace app-owned navigation inputs;review patched supported router migration | Guards/history/splat/future flags/RBAC E2E |
| Expo/RN/Metro | Respect Expo compatibility matrix;review RN0.83.10 patch first | Native export/debug/release/device workflows |
| image-size | npm says non-force fix available;review parent range/API | Metro/image/export consumers |
| node-forge |1.4.0 still affected;review Expo code-signing chain | Certificate tooling and reachability |
| sprintf-js | Follow argparse/js-yaml/Jest/Babel parent constraints | Transform/native regression |
| uuid | Expo/xcode parent/API/CJS/ESM compatibility | Avoid forced Expo44 downgrade |
| JVM | Generate SBOM/qualified scan/framework support plan | Maven plus MySQL/container tests |
| DTO/mapper boundaries | Separate commands from derived/status responses | Mutation invariants and contract tests |
| Report/list contracts | Typed metric units and pagination metadata | Six reports and >50 native rows |

Audit roots: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99), [PostCSS](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), [React Router redirect](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6), [hydration](https://github.com/advisories/GHSA-337j-9hxr-rhxg), [image-size](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Vite additionally reports sourcemap path traversal,Windows editor UNC handling,and filesystem-deny bypass.

No blind major migrations or force upgrades. npm's suggested Expo44 downgrade is not a compatible plan. Function reachability/exploitability remains to be established; dev/build dependencies must not be dismissed automatically.

## 21. Prioritized development roadmap

| Phase | Scope | Acceptance and verification |
| --- | --- | --- |
|1 P0 | Supplier ledger/received-state invariants | Prepay/receive/delete sums correct;stock effect once;POST/PUT bypass rejected;real-MySQL concurrency |
|2 P1 | PO reads/native picker flow | Detail200/missing404;edit loads;customer/draft survives picker;actual quote→order→payment |
|3 P1 | CI/verification/cleanup/MySQL | Required vars/readiness/seed/cleanup;failures nonzero;all420 tests;real migration evidence |
|4 P1 | Production files/shared assets | Nginx paths/auth/headers;reference-safe mixed-variant cleanup;non-root volume test |
|5 P1/P2 | Compatible dependencies/native tooling | Reviewed patch set first;approved major migrations;clean/accepted audits;export/debug/release/device |
|6 P2 | Validation/errors/accessibility/reports/paging/defaults | DTO400/sort/path tests;no defaults;semantic controls;count units;>50 reachability |
|7 P2 | Policy/throttle/conversion/operations risks | Finance role decision;bounded shared throttle;conversion concurrency;backup/restore alert drill |
|8 P3 | Approved product gaps | User management,journal,exports,returns,offline,notifications scoped individually |

Keep existing architecture/authorization. Fix root causes,retain tests,add defect-reproducing assertions,group logical changes. This audit-only request does not authorize source fixes/commits.

## 22. Recommended architectural improvements

1. A transaction-owned purchasing state/ledger service; DTOs cannot perform receiving.
2. Persistent native draft state and explicit navigation return to existing form.
3. Managed file assets with ownership/reference-safe post-commit deletion.
4. Disposable real MySQL integration and financial/inventory concurrency tests.
5. Scope-declaring verification with all inventories and fail-closed cleanup.
6. Typed reports,paged native lists,generated accurate API contracts.
7. Preserve modular monolith;async catalogue/outbox notifications only when measured requirements justify.
8. Explicit financial command/idempotency/reversal contracts.

## 23. Exact verification and reproduction commands

Passwords/JWT values must be supplied securely through environment or ignored local configuration;no values are included here.

Required: QA_ADMIN_PASSWORD,QA_MANAGER_PASSWORD,QA_SALES_PASSWORD,QA_WAREHOUSE_PASSWORD;backend additionally JWT_SECRET.

~~~powershell
# Separate backend shell
cd backend
.\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run '-Dspring-boot.run.profiles=qa'

# Separate frontend shell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173

# Root
npm run verify
git diff --check

# Granular
cd backend
.\apache-maven-3.9.6\bin\mvn.cmd test
cd ../frontend
npm test
npm run build
npm audit --audit-level=high
cd ../mobile
npm test
npm run lint
npm audit --audit-level=high
cd ../automation-tests
npm run health
npm run seed
npm run test:api
npm run test:frontend
npm run test:database
npm run test:security
npm run test:bughunt
npx playwright test --project="Mobile Chrome (Pixel 5)" --project="Mobile Safari (iPhone 13)"
npm run cleanup

# Legacy frontend suite; QA_ADMIN_PASSWORD in shell
cd ../frontend
npm exec --no -- playwright install chromium
npm exec --no -- playwright test tests/e2e/full-flow.spec.js --reporter=line

# Actual Expo server, separate shell
cd ../mobile
$env:EXPO_PUBLIC_API_BASE_URL = 'http://localhost:8081/api'
npm run web -- --host localhost

# Native smoke shell; QA_PASSWORD set securely
$env:UI_URL = 'http://localhost:8082'
$env:API_URL = 'http://localhost:8081/api'
$env:RUN_LEGACY_SMOKE = '1'
npm run ui:smoke
npm run export:android
npm run build:android:debug
npm run build:android:release
~~~

Direct API: authenticate with env password,hold token only in memory,send Bearer header. F02/F17 steps supply numeric payloads and oracle. Use unique fixtures and check IDs before dependent requests. Never positive-test DELETE products/all against shared/production data.

## 24. Evidence and source locations

| Evidence | Location |
| --- | --- |
| Fresh root summary | reports/verification-summary.json |
| Maven evidence | reports/backend-tests.log;backend/target/surefire-reports/ |
| Granular suites | reports/automation-*.log |
| Current Playwright HTML | automation-tests/reports/;successive runs replace previous HTML |
| Legacy7 failures | frontend/test-results/tests-e2e-full-flow-*/error-context.md |
| Actual Expo smoke screenshot | reports/audit-evidence/expo-smoke-blocked.png |
| Native build diagnostics | mobile/android/build/reports/problems/problems-report.html |
| Manual images/DOM | Codex conversation tool output;not falsely described as saved screenshot files |
| Controller inventory |104 source line references in section6 |
| Financial/PO roots | PurchaseOrderServiceImpl.java:141,206,256;DistributorPaymentServiceImpl.java:81;mapper/PurchaseOrderMapper.java:75 |
| Native picker | mobile/src/screens/ProductPickerScreen.js:84;QuotationFormScreen.js:38 |
| Validation/error | DistributorController.java:23;dto/DistributorDTO.java:14;web/PaginationFactory.java:27;FileUploadServiceImpl.java:181 |
| CI/cleanup/default | .github/workflows/ci.yml:84;automation-tests/scripts/cleanup-test-data.js:105;mobile/scripts/ui-smoke-test.mjs:6 |
| Report format | frontend/src/pages/reports/ReportsPage.jsx:145 |
| DB gaps | automation-tests/database/specs/flyway-migration.spec.js:6;schema-validation.spec.js:6;application-qa.properties:6 |
| Shared bytes | CatalogPdfImportService.java:114;ProductServiceImpl.java:287,350 |
| Primary references | Nginx and React Navigation links in sections16/17 |
| Historical corpus | Explicit dispositions in section14 |

Generated test/build evidence is local/ignored and must not be committed as application source. Report reproductions/statuses are inline and self-contained. No passwords,tokens,or raw credential-bearing responses are embedded.

## 25. Environment blockers and unverified areas

- WSL /bin/bash and Aside absent;formal gstack startup/ledgers unavailable.
- Trusted CSO launcher absent;no helper/scanner-qualified assurance.
- Docker Linux named pipe unavailable;production-style headers/container/MySQL/restore unverified.
- Hermes export child-spawn cause unresolved despite direct executable0.
- Native debug >260 paths;release dirty Ninja manifest.
- Real devices/emulators,signing/install/offline/camera/background behavior unverified.
- Not every role×endpoint×owner×boundary or UI control/state permutation executed.
- Fresh large positive PDF and all product-catalogue/price-list layouts unverified;mixed retained-image byte cleanup not reproduced.
- SMTP/Twilio,cloud changes/deployment,real transactions not performed.
- No certified secret-history/JVM scan/compliance/production penetration attestation.
- Some synthetic QA records remain where the APIs disallow deletion/current cleanup omits IDs. No full cleanup claim. Generic synthetic upload lacks delete API.
- Root-generated summary is scoped green;native/legacy failures belong in this master report and must be added to verification during remediation.

## 26. Final assessment and next actions

The repository has real functional breadth and a useful configured test foundation. It is not ready for production based on the current purchasing,actual-native,build/CI/file,and assurance findings.

Prioritize F02/F17 money/inventory integrity,then F01/F03 user workflows,verification/CI,files/deployment,and compatible dependencies/native tooling. Reconsider readiness only after defect repros,all420 discovered cases,actual Expo lifecycle,native builds,and disposable MySQL/Nginx validation pass.

Completion: DONE_WITH_CONCERNS,partial runtime coverage. The consolidated report is the only authored audit document. No application code changes,commit,push,or deployment.

### Durable audit learnings

- Root “mobile viewport” means Vite UI,not native Expo.
- A green health assertion is not Flyway/schema validation.
- A lock query needs a service transaction;mock service tests miss this boundary.
- React Navigation7 navigate does not return to an existing form.
- Fixture cleanup success must inspect exit behavior and actual retained/deleted state.

### Final working-tree and report-integrity verification

Standard git diff --check passed (exit0) under the repository's configured line-ending behavior. A separate diagnostic with core.autocrlf=false reported existing CRLF as whitespace; that temporary override was not persisted and no source formatting was changed.

The report was checked for all26 numbered sections,104 unique endpoint rows,balanced code fences,valid UTF-8,and the known supplied/default secret values:zero matches. Final release build failed as recorded in section11. No fabricated complete browser/security/scanner pass is claimed.

Working tree remains intentionally dirty:83 modified tracked entries,1 deleted tracked entry,10 untracked entries. The deletion and application modifications pre-existed the audit. The new authored document is CRM_COMPLETE_MASTER_AUDIT_REPORT.md. Generated logs/summary/build output remain ignored. The generated Expo smoke screenshot was moved into ignored reports/audit-evidence/ for preservation;it was not deleted.

Full current status (directory entries are reported as Git groups):

~~~text
 M .github/workflows/ci.yml
 M .gitignore
 M README.md
 M automation-tests/.env.example
 M automation-tests/README.md
 M automation-tests/api/helpers/authHelper.js
 M automation-tests/api/helpers/testDataHelper.js
 M automation-tests/api/specs/auth.api.spec.js
 M automation-tests/data/test-users.json
 M automation-tests/frontend/bug-hunt/responsive.e2e.spec.js
 M automation-tests/frontend/bug-hunt/sales-role-visual.e2e.spec.js
 M automation-tests/frontend/pages/CategoryPage.js
 M automation-tests/frontend/pages/CustomerPage.js
 M automation-tests/frontend/pages/DashboardPage.js
 M automation-tests/frontend/pages/DistributorPage.js
 M automation-tests/frontend/pages/LoginPage.js
 M automation-tests/frontend/pages/ProductPage.js
 M automation-tests/frontend/pages/QuotationPage.js
 M automation-tests/frontend/specs/attachments.e2e.spec.js
 M automation-tests/frontend/specs/audit-logs.e2e.spec.js
 M automation-tests/frontend/specs/categories.e2e.spec.js
 M automation-tests/frontend/specs/customers.e2e.spec.js
 M automation-tests/frontend/specs/dashboard.e2e.spec.js
 M automation-tests/frontend/specs/distributors.e2e.spec.js
 M automation-tests/frontend/specs/full-crm-flow.e2e.spec.js
 M automation-tests/frontend/specs/login.e2e.spec.js
 M automation-tests/frontend/specs/orders.e2e.spec.js
 M automation-tests/frontend/specs/payments.e2e.spec.js
 M automation-tests/frontend/specs/products.e2e.spec.js
 M automation-tests/frontend/specs/purchase-orders.e2e.spec.js
 M automation-tests/frontend/specs/quotations.e2e.spec.js
 M automation-tests/frontend/specs/reports.e2e.spec.js
 M automation-tests/mobile/specs/mobile-dashboard.spec.js
 M automation-tests/mobile/specs/mobile-login.spec.js
 M automation-tests/mobile/specs/mobile-navigation.spec.js
 M automation-tests/mobile/specs/mobile-products.spec.js
 M automation-tests/mobile/specs/mobile-smoke.spec.js
 M automation-tests/package.json
 M automation-tests/playwright.config.js
 M automation-tests/scripts/cleanup-test-data.js
 M automation-tests/scripts/seed-test-data.js
 M backend/src/main/java/com/sanitaryware/crm/config/DevQaUserInitializer.java
 M backend/src/main/java/com/sanitaryware/crm/config/SecurityConfig.java
 M backend/src/main/java/com/sanitaryware/crm/controller/AuthController.java
 M backend/src/main/java/com/sanitaryware/crm/controller/ProductController.java
 M backend/src/main/java/com/sanitaryware/crm/dto/BulkUploadResponse.java
 M backend/src/main/java/com/sanitaryware/crm/entity/Product.java
 M backend/src/main/java/com/sanitaryware/crm/repository/ProductRepository.java
 M backend/src/main/java/com/sanitaryware/crm/service/CatalogPdfImportService.java
 M backend/src/main/java/com/sanitaryware/crm/service/ProductService.java
 M backend/src/main/java/com/sanitaryware/crm/service/ProductServiceImpl.java
 M backend/src/main/resources/application-qa.properties
 M docs/qa-full-report-2026-10-11.md
 M docs/qa/NEGATIVE_TEST_CASES.md
 M docs/qa/POSITIVE_TEST_CASES.md
 M docs/qa/TEST_DATA_PLAN.md
 M frontend/index.html
 M frontend/nginx.conf
 M frontend/package-lock.json
 M frontend/package.json
 M frontend/src/App.jsx
 M frontend/src/components/DashboardLayout.jsx
 M frontend/src/components/ProductSearchSelect.jsx
 M frontend/src/components/ui/Feedback.jsx
 M frontend/src/components/ui/Field.jsx
 M frontend/src/components/ui/Modal.jsx
 M frontend/src/pages/DashboardPage.jsx
 M frontend/src/pages/audit/AuditLogsPage.jsx
 M frontend/src/pages/customers/CustomerListPage.jsx
 M frontend/src/pages/orders/OrderFormPage.jsx
 M frontend/src/pages/orders/OrderListPage.jsx
 M frontend/src/pages/products/BulkUploadModal.jsx
 M frontend/src/pages/products/ProductFormPage.jsx
 M frontend/src/pages/products/ProductListPage.jsx
 M frontend/src/pages/purchase-orders/PurchaseOrderFormPage.jsx
 M frontend/src/pages/quotations/QuotationListPage.jsx
 M frontend/src/pages/reports/ReportsPage.jsx
 M frontend/src/services/fileUploadService.js
 M frontend/src/services/productService.js
 M frontend/tests/e2e/full-flow.spec.js
 M mobile/package-lock.json
 M mobile/src/screens/QuotationFormScreen.js
 D mobile/src/utils/quotationTotals.js
 M mobile/src/utils/quotationTotals.test.mjs
?? CRM_COMPLETE_MASTER_AUDIT_REPORT.md
?? TESTING.md
?? automation-tests/config/
?? backend/src/main/java/com/sanitaryware/crm/controller/QaCatalogueCleanupController.java
?? backend/src/main/resources/db/migration/V10__Track_Catalogue_Import_Batches.sql
?? docs/gstack-project-review-2026-10-11.md
?? docs/manual-complete-functional-qa-2026-10-12.md
?? mobile/src/utils/quotationTotals.mjs
?? package.json
?? scripts/
~~~

Screenshot evidence for the actual Expo first-page fixture limitation:

![Actual Expo customer list showing first 50 records](<C:/Users/akhil/OneDrive/Desktop/Workspace/New folder/SanitarywareCRM/reports/audit-evidence/expo-smoke-blocked.png>)

No commit or push was performed. Formal CSO remains not assessed because the installed launcher prerequisite is absent.
