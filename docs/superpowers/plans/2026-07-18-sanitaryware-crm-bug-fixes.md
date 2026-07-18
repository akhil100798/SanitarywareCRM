# Sanitaryware CRM Confirmed Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix BUG-001 through BUG-010 and the confirmed production blockers, prove every behavioral change with regression tests, and publish an evidence-based release verdict.

**Architecture:** Spring method security remains authoritative; shared sanitized API errors and pagination validation keep HTTP behavior consistent. Customer normalization and purchase-order reference resolution run before persistence. React mirrors backend roles for UX, Playwright proves cross-stack behavior, and production uses required MySQL/JWT environment variables with validated Compose definitions.

**Tech Stack:** Java 17, Spring Boot 3.2.2, Spring Security, JPA, Flyway/MySQL, JUnit 5/MockMvc/Mockito, React 18, Zustand, React Router 6, Vite 5, Playwright, Docker Compose, nginx.

## Global Constraints

- Fix only confirmed bugs and production blockers; do not redesign the UI.
- Do not weaken, skip, or remove existing tests.
- Add a failing regression test before each production behavior change.
- Backend authorization is authoritative; frontend guards improve UX only.
- Product and settings mutations allow exactly `ADMIN` and `MANAGER`.
- Frontend denial copy: `You don’t have access to this page.`
- Backend denial copy: `You do not have access to this resource.`
- Pagination: page defaults to `0`, size to `20`; page >= `0`, size `1..100`.
- Customer phone is digit-only; blank email becomes null; missing type becomes `RETAIL`.
- Do not commit secrets, use production H2, or run `npm audit fix --force`.
- Release Ready requires fresh passing output for every release gate.

## Bug coverage map

| Bug | Implementation task |
|---|---|
| BUG-001 product mutation authorization | Task 1 |
| BUG-002 settings mutation authorization | Task 1 |
| BUG-003 null body and unknown-route sanitization | Task 2 |
| BUG-004 purchase-order reference leakage | Task 3 |
| BUG-005 customer type default | Task 4 |
| BUG-006 customer email validation | Task 4 |
| BUG-007 customer phone uniqueness | Task 4 |
| BUG-008 frontend SALES authorization UX | Task 6 |
| BUG-009 role-aware dashboard greeting | Task 6 |
| BUG-010 pagination validation | Task 5 |

---

### Task 1: Backend product and settings authorization

**Files:**
- Modify: `backend/src/main/java/com/sanitaryware/crm/controller/ProductController.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/controller/SystemSettingsController.java`
- Create: `backend/src/test/java/com/sanitaryware/crm/controller/AuthorizationControllerTest.java`
- Modify: `automation-tests/security/specs/role-access.spec.js`

**Interfaces:** Existing `@EnableMethodSecurity`; produces mutation guards using `hasAnyRole('ADMIN', 'MANAGER')`.

- [ ] **Step 1: Write failing method-security tests**

Use `@WebMvcTest`, mocked services, `@WithMockUser`, and request post-processors. Cover ADMIN/MANAGER success and SALES denial for product POST/PUT/DELETE/PATCH/bulk upload and settings PUT. Cover SALES product list/search and settings GET success. Example:

```java
@Test @WithMockUser(roles = "SALES")
void salesCannotDeleteProduct() throws Exception {
    mvc.perform(delete("/api/products/7")).andExpect(status().isForbidden());
    verifyNoInteractions(productService);
}
```

- [ ] **Step 2: Verify RED**

Run: `cd backend; mvn -Dtest=AuthorizationControllerTest test`

Expected: SALES mutations return success instead of 403.

- [ ] **Step 3: Implement minimal guards**

Annotate product POST, PUT, DELETE, PATCH stock, bulk upload, and settings PUT with `@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")`. Annotate product reads and settings GET with all three authenticated roles.

- [ ] **Step 4: Verify GREEN and extend Playwright**

Run: `cd backend; mvn -Dtest=AuthorizationControllerTest test`

In `role-access.spec.js`, prove ADMIN/MANAGER mutations, SALES mutation 403s, SALES list/search 200s, settings policy, and unauthenticated settings PUT 401.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/main/java/com/sanitaryware/crm/controller backend/src/test/java/com/sanitaryware/crm/controller/AuthorizationControllerTest.java automation-tests/security/specs/role-access.spec.js
git commit -m "fix: enforce management authorization"
```

### Task 2: Sanitized API and security error contract

**Files:**
- Create: `backend/src/main/java/com/sanitaryware/crm/dto/ApiErrorResponse.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/config/SecurityConfig.java`
- Create: `backend/src/test/java/com/sanitaryware/crm/exception/GlobalExceptionHandlerTest.java`
- Modify: `backend/src/test/java/com/sanitaryware/crm/controller/ProductControllerTest.java`

**Interfaces:** Produces `ApiErrorResponse(int status, String error, String message, Map<String,String> validationErrors)` for advice and security filters.

- [ ] **Step 1: Write failing sanitization tests**

Assert null body/malformed JSON -> 400; authenticated nonexistent route -> 404; missing parameter/type mismatch -> 400; access denied -> 403; integrity conflict -> 409; unexpected runtime -> 500. Assert bodies omit `SQLState`, `org.hibernate`, `java.lang`, signatures, and constraint names.

- [ ] **Step 2: Verify RED**

Run: `cd backend; mvn -Dtest=GlobalExceptionHandlerTest,ProductControllerTest test`

Expected: current response shape and leaked exception messages fail.

- [ ] **Step 3: Implement explicit safe handlers**

Map unreadable/missing/type mismatch to `Invalid request`; validation to `Validation failed` plus safe field messages; resource exceptions to 404; access denied to the approved 403 copy; integrity violations to `Request conflicts with existing data`; unexpected exceptions to `An unexpected error occurred`. Retain safe bad-credentials 401. Never serialize generic `ex.getMessage()`.

- [ ] **Step 4: Sanitize filter-level responses**

Inject `ObjectMapper` into `SecurityConfig`; configure both authentication entry point and access denied handler to serialize `ApiErrorResponse` without framework text.

- [ ] **Step 5: Verify and commit**

Run: `cd backend; mvn -Dtest=GlobalExceptionHandlerTest,ProductControllerTest,AuthorizationControllerTest test`

```powershell
git add backend/src/main/java/com/sanitaryware/crm/dto/ApiErrorResponse.java backend/src/main/java/com/sanitaryware/crm/exception/GlobalExceptionHandler.java backend/src/main/java/com/sanitaryware/crm/config/SecurityConfig.java backend/src/test/java
git commit -m "fix: sanitize API error responses"
```

### Task 3: Purchase-order reference validation

**Files:**
- Modify: `backend/src/main/java/com/sanitaryware/crm/service/PurchaseOrderServiceImpl.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/mapper/PurchaseOrderMapper.java`
- Create: `backend/src/test/java/com/sanitaryware/crm/service/PurchaseOrderServiceImplTest.java`

**Interfaces:** Service helpers `resolveDistributor(Long)` and `resolveProduct(Long)` throw `ResourceNotFoundException`; mapper performs no repository lookup.

- [ ] **Step 1: Write tests for missing distributor/product on create and update**

Mock repository lookup to empty; assert `ResourceNotFoundException` and `verify(purchaseOrderRepository, never()).save(any())`.

- [ ] **Step 2: Verify RED**

Run: `cd backend; mvn -Dtest=PurchaseOrderServiceImplTest test`

Expected: mapper silently leaves null relationships or persistence is reached.

- [ ] **Step 3: Resolve every reference before save**

Resolve distributor and all item products in the service for both create/update, set relationships, then calculate totals. Replace generic not-found runtime exceptions in this service with `ResourceNotFoundException`. Remove mapper repository fields and silent `ifPresent` calls.

- [ ] **Step 4: Verify and commit**

Run: `cd backend; mvn -Dtest=PurchaseOrderServiceImplTest test`

```powershell
git add backend/src/main/java/com/sanitaryware/crm/service/PurchaseOrderServiceImpl.java backend/src/main/java/com/sanitaryware/crm/mapper/PurchaseOrderMapper.java backend/src/test/java/com/sanitaryware/crm/service/PurchaseOrderServiceImplTest.java
git commit -m "fix: validate purchase order references"
```

### Task 4: Customer defaults, validation, and normalized uniqueness

**Files:**
- Modify: `backend/src/main/java/com/sanitaryware/crm/dto/CustomerDTO.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/entity/Customer.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/mapper/CustomerMapper.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/repository/CustomerRepository.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/service/CustomerServiceImpl.java`
- Create: `backend/src/main/java/com/sanitaryware/crm/exception/ConflictException.java`
- Modify: `backend/src/main/java/com/sanitaryware/crm/exception/GlobalExceptionHandler.java`
- Create: `backend/src/main/resources/db/migration/V2__Normalize_And_Unique_Customer_Phone.sql`
- Create: `backend/src/test/java/com/sanitaryware/crm/service/CustomerServiceImplTest.java`
- Modify: `backend/src/test/java/com/sanitaryware/crm/controller/CustomerControllerTest.java`

**Interfaces:** Repository adds `existsByPhoneNumber`, `existsByPhoneNumberAndIdNot`, `existsByEmail`, and `existsByEmailAndIdNot`; service owns normalization.

- [ ] **Step 1: Write failing tests**

Cover missing type -> RETAIL; invalid email -> 400; blank email -> null; `+91 98765-43210` -> `919876543210`; duplicate normalized phone -> 409; same-customer update -> no false conflict; duplicate email -> sanitized 409.

- [ ] **Step 2: Verify RED**

Run: `cd backend; mvn -Dtest=CustomerControllerTest,CustomerServiceImplTest test`

- [ ] **Step 3: Implement DTO/mapping/service behavior**

Add `@Email(message = "Email must be valid")`; default null type to RETAIL; normalize phone with `value.trim().replaceAll("\\D", "")`; normalize null/blank email to null, otherwise trim. Reject an empty normalized phone. Perform create/update uniqueness checks, excluding current ID on update. Throw `ConflictException`, mapped by Task 2 to safe 409. Mark entity phone unique.

- [ ] **Step 4: Add migration without destructive deduplication**

Normalize current values with MySQL `REGEXP_REPLACE`, then add `uk_customers_phone_number`. If normalized duplicates exist, migration fails and requires explicit data cleanup; it must not delete/merge customers automatically.

- [ ] **Step 5: Verify and commit**

Run: `cd backend; mvn -Dtest=CustomerControllerTest,CustomerServiceImplTest test`

```powershell
git add backend/src/main backend/src/test/java/com/sanitaryware/crm/controller/CustomerControllerTest.java backend/src/test/java/com/sanitaryware/crm/service/CustomerServiceImplTest.java
git commit -m "fix: validate and normalize customers"
```

### Task 5: Shared pagination validation

**Files:**
- Create: `backend/src/main/java/com/sanitaryware/crm/web/PaginationFactory.java`
- Create: `backend/src/test/java/com/sanitaryware/crm/web/PaginationFactoryTest.java`
- Modify paginated methods in: `ProductController.java`, `CustomerController.java`, `DistributorController.java`, `OrderController.java`, `QuotationController.java`, `PurchaseOrderController.java`, `DistributorPaymentController.java`
- Modify: `automation-tests/api/bug-hunt/extended-negative.api.spec.js`

**Interfaces:** `Pageable PaginationFactory.create(int page, int size, String[] sort)`; PaymentController remains unchanged because its list is not paginated.

- [ ] **Step 1: Write failing factory/controller tests**

Assert page -1, size 0, size 1000000 -> safe 400; page 0/size 20 -> service receives a valid Pageable.

- [ ] **Step 2: Verify RED**

Run: `cd backend; mvn -Dtest=PaginationFactoryTest,*ControllerTest test`

- [ ] **Step 3: Implement and apply factory**

Validate bounds; parse each Spring-style `sort=property,direction` value; reject invalid direction. Replace direct Pageable binding with explicit `@RequestParam(defaultValue="0") int page`, `@RequestParam(defaultValue="20") int size`, optional `String[] sort`, then call the factory.

- [ ] **Step 4: Verify and commit**

Run: `cd backend; mvn -Dtest=PaginationFactoryTest,*ControllerTest test`

```powershell
git add backend/src/main/java/com/sanitaryware/crm/web backend/src/main/java/com/sanitaryware/crm/controller backend/src/test/java automation-tests/api/bug-hunt/extended-negative.api.spec.js
git commit -m "fix: validate pagination bounds"
```

### Task 6: Frontend role policy and greeting

**Files:**
- Create: `frontend/src/pages/UnauthorizedPage.jsx`
- Modify: `frontend/src/components/ProtectedRoute.jsx`
- Modify: `frontend/src/components/DashboardLayout.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/DashboardPage.jsx`
- Modify mutation controls in: `ProductListPage.jsx`, `CategoryListPage.jsx`, `BrandListPage.jsx`
- Modify: `automation-tests/frontend/bug-hunt/sales-role-visual.e2e.spec.js`

**Interfaces:** `ProtectedRoute({children, allowedRoles})`; management roles are `['ADMIN', 'MANAGER']`.

- [ ] **Step 1: Reverse bug-hunt assertions and verify RED**

Assert SALES lacks management sidebar links and mutation controls; direct `/settings` shows exact denied copy; ADMIN sees/opens settings; SALES greeting excludes Administrator.

Run: `cd automation-tests; npx playwright test frontend/bug-hunt/sales-role-visual.e2e.spec.js --project=chromium --reporter=line`

- [ ] **Step 2: Implement route guard and route matrix**

Unauthenticated -> Login. Authenticated disallowed role -> UnauthorizedPage inside DashboardLayout. Restrict Settings, distributor, purchase-order, distributor-payment, product create/edit, and category/brand management routes to ADMIN/MANAGER. Keep dashboard/customers/product list/quotations/orders/payments/profile authenticated-only.

- [ ] **Step 3: Filter links and controls**

Add optional roles to menu items and filter against `user.role`. Hide product create/edit/delete/bulk and category/brand mutation controls from SALES.

- [ ] **Step 4: Implement greeting**

```jsx
const fallbackName = { ADMIN: 'Administrator', MANAGER: 'Manager', SALES: 'Sales Staff' };
const displayName = user?.fullName?.trim() || fallbackName[user?.role] || 'User';
```

Render `Hello, {displayName}`.

- [ ] **Step 5: Verify and commit**

Run: `cd frontend; npm run build`

Run: `cd automation-tests; npx playwright test frontend/bug-hunt/sales-role-visual.e2e.spec.js --project=chromium --reporter=line`

```powershell
git add frontend/src automation-tests/frontend/bug-hunt/sales-role-visual.e2e.spec.js
git commit -m "fix: mirror role policy in frontend"
```

### Task 7: Playwright discovery and database correctness

**Files:**
- Modify: `automation-tests/playwright.config.js`
- Modify: `automation-tests/package.json`
- Modify: `automation-tests/database/specs/constraints.spec.js`
- Remove after native discovery works: `automation-tests/security/bug-hunt/omitted-suites.security.spec.js`

**Interfaces:** Chromium discovers all `*.spec.js` under api/frontend/security/database specs; mobile projects remain mobile-only; bug-hunt script targets explicit bug-hunt directories.

- [ ] **Step 1: Capture failing discovery**

Run: `cd automation-tests; npx playwright test security/specs database/specs --list`

Expected: valid role/database filenames are omitted.

- [ ] **Step 2: Fix path-aware matchers and scripts**

Add `test:all`, preserve `test:security`/`test:database`, and add `test:bughunt` targeting api/frontend/security bug-hunt directories under Chromium.

- [ ] **Step 3: Correct the stale soft-delete test**

DELETE customer -> 204; GET customer -> `isActive === false`; related orders retain the customer reference. Remove acceptance of 400/500.

- [ ] **Step 4: Verify and commit**

Run: `cd automation-tests; npx playwright test security/specs database/specs --list`

Expected: every file listed exactly once.

```powershell
git add automation-tests/playwright.config.js automation-tests/package.json automation-tests/database/specs/constraints.spec.js
git commit -m "fix: discover security and database suites"
```

### Task 8: Production configuration and containers

**Files:**
- Create: `backend/src/main/resources/application-prod.properties`
- Create: `backend/src/test/java/com/sanitaryware/crm/config/ProductionConfigurationTest.java`
- Modify: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `docker-compose.staging.yml`
- Create: `docker-compose.prod.yml`
- Create: `.env.staging.example`
- Create: `.env.production.example`

**Interfaces:** Production requires DATABASE_URL/USERNAME/PASSWORD, JWT_SECRET, and CORS_ALLOWED_ORIGIN_PATTERNS; nginx proxies `/api/` and provides SPA fallback.

- [ ] **Step 1: Write and run failing production-properties test**

Load the properties and assert required placeholders have no `:` fallback, MySQL/Flyway/JPA validate are enabled, devtools/SQL are disabled, and server errors never include messages/stacks.

Run: `cd backend; mvn -Dtest=ProductionConfigurationTest test`

Expected: missing production file fails.

- [ ] **Step 2: Add production profile and verify GREEN**

Use `${DATABASE_URL}`, `${DATABASE_USERNAME}`, `${DATABASE_PASSWORD}`, `${JWT_SECRET}`, `${CORS_ALLOWED_ORIGIN_PATTERNS}`; configure MySQL, Flyway, `ddl-auto=validate`, `server.error.include-message=never`, `server.error.include-stacktrace=never`, and disabled devtools.

Run: `cd backend; mvn -Dtest=ProductionConfigurationTest test`

- [ ] **Step 3: Add images, nginx, Compose, and placeholder env files**

Fix backend JVM argument order. Frontend uses Node build plus nginx runtime; nginx uses `try_files $uri $uri/ /index.html` and proxies `/api/` to backend. Staging includes healthy MySQL and dependent backend/frontend; production includes backend/frontend with external DB variables. Example env files contain placeholders only.

- [ ] **Step 4: Validate Compose and commit**

Run: `docker compose --env-file .env.staging.example -f docker-compose.staging.yml config`

Run: `docker compose --env-file .env.production.example -f docker-compose.prod.yml config`

```powershell
git add backend/src/main/resources/application-prod.properties backend/src/test/java/com/sanitaryware/crm/config/ProductionConfigurationTest.java backend/Dockerfile frontend/Dockerfile frontend/nginx.conf docker-compose.staging.yml docker-compose.prod.yml .env.staging.example .env.production.example
git commit -m "build: add production deployment configuration"
```

### Task 9: Safe production dependency remediation

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [ ] **Step 1: Record audit RED**

Run: `cd frontend; npm audit --omit=dev --json`

- [ ] **Step 2: Apply compatible patches/minors**

Update axios and React Router within compatible APIs and refresh safe transitive versions. Do not use force or silently accept a breaking major.

- [ ] **Step 3: Verify and commit**

Run: `cd frontend; npm run build`

Run: `cd frontend; npm audit --omit=dev`

Expected: build passes and no high production finding remains; otherwise document the exact major-upgrade blocker.

```powershell
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: remediate frontend dependencies"
```

### Task 10: Full verification and report

**Files:**
- Create: `docs/qa/BUG_FIX_VERIFICATION_REPORT.md`

- [ ] **Step 1: Run backend gates**

Run: `cd backend; mvn clean test; mvn clean package`

- [ ] **Step 2: Run frontend gates**

Run: `cd frontend; npm install; npm run build; npm audit --omit=dev`

- [ ] **Step 3: Run automation gates**

Run: `cd automation-tests; npm install; npm run health; npm run seed; npm run test:all; npm run test:security -- --reporter=line; npm run test:database -- --reporter=line; npm run test:bughunt -- --reporter=line`

- [ ] **Step 4: Run both Compose config validations**

Use the exact commands from Task 8 and record exit codes.

- [ ] **Step 5: Reproduce BUG-001 through BUG-010**

For each bug record role/input, endpoint/route, expected result, actual status/UI, sanitized body, and named regression test. PASS only when the original reproduction no longer occurs.

- [ ] **Step 6: Write the requested report sections**

Populate Executive Summary, Bugs Fixed, Authorization, API Errors, Customer Validation, Frontend Roles, Production Fixes, Dependency Audit, Commands Run, Remaining Issues, and Final QA Verdict from fresh evidence only.

- [ ] **Step 7: Apply strict verdict and diff checks**

Release Ready only if all required high/security bugs, backend tests/package, frontend build, security/database/full Playwright, Compose, and high audit gates pass. Otherwise use Staging Ready Only or Not Release Ready with blockers.

Run: `git diff --check; git status --short; git diff --stat`

Confirm no secrets, node_modules, build output, Playwright report artifacts, or screenshots are staged.
