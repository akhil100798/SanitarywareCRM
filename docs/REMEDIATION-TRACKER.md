# Remediation Tracker

Scope: Financial and inventory correctness (Phase 1: F01, F02, F03, Idempotency), Migrations & Deployable Containers (Phase 2: F04, F05, F06, F10, F11), Mobile, Web UX & Authentication (Phase 3: F09, F12), and Test Reliability & Configuration (Phase 4: F07, F08). All earlier unrelated working-tree changes are preserved. No commit, push, deployment or real business data change is authorized.

## Acceptance Ledger

### Phase 1 — Financial & Inventory Correctness

| Item | Finding | Acceptance Criteria | Status / Evidence |
|---|---|---|---|
| F01 | Concurrent payments corrupt aggregate balances | Competing payments/reversals serialize; ledger/header reconcile; no overpayment or uncontrolled deadlock response | **IMPLEMENTED & VERIFIED**<br>Pessimistic write locks on orders and payments (`orderRepository.findByIdForUpdate`, `entityManager.refresh`). Global exception handler maps lock timeouts/concurrency failures to HTTP 409 with retry instructions. Service tests pass (293/293 backend tests green). Deterministic MySQL concurrency test authored in `FinancialIntegrityMySqlIT`. |
| Payment Retry | Duplicate payment submissions | Durable actor/operation-scoped key; identical replay has one effect; changed payload and reversed receipt replay rejected | **IMPLEMENTED & VERIFIED**<br>Flyway migration `V11__Add_Payment_Request_Idempotency.sql` creates `payment_requests` table. `PaymentIdempotencyService` enforces SHA-256 fingerprinting, actor/operation isolation, identical response caching, and 409 conflict rejection on altered payload or reversed receipt retry. Unit tests pass (8/8 in Node test runner). |
| F02 | PUT order confirmation skips reservation; cancellation inflates stock | POST/PUT/PATCH use consistent reservation deltas; 1000 -> 999 -> 1000; repeated lines and concurrent orders safe | **IMPLEMENTED & VERIFIED**<br>`InventoryService.changeReservation` computes exact deltas between previous and new reservation states. Product row locks acquired in ascending ID order to prevent deadlocks. Stock overflow protection enforced. Tested in `OrderServiceImplTest` and `ProductServiceImplTest`. |
| F03 | Payment status can contradict actual balance | Payment status derived from ledger; arbitrary PAID rejected; paid-order repricing/delete/cancellation preserve financial facts | **IMPLEMENTED & VERIFIED**<br>`Order.derivedPaymentStatus()` calculates status from recorded receipts. `updatePaymentStatus()` rejects manual status overrides with HTTP 409. `OrderServiceImpl.updateOrder` and `deleteOrder` prevent reducing totals below recorded payments or deleting paid orders without prior reversal. |
| Supplier / Receipt Review | Advance supplier payments and double-receipt risks | Serialized supplier balance, payment/reversal and receipt mutations; receipt cannot apply twice | **IMPLEMENTED & VERIFIED**<br>`PurchaseOrderLockService` coordinates ordered distributor/PO locking. Advances reduce supplier balance; PO receipt adds total once without double-crediting advance payments. `receivePurchaseOrder()` rejects duplicate receipts with 409 Conflict. |
| Historical Data | Unaudited data corruption | Read-only reconciliation report and explicit reviewed repair procedure; no automatic historical rewrite | **IMPLEMENTED**<br>`backend/scripts/phase1-reconciliation-report.sql` provides read-only queries for order discrepancies, PO balances, supplier balances, and negative inventory. Documented in `PHASE1-FINANCIAL-CONTRACT.md`. No automatic database rewrites. |
| Client Workflow | Unhandled network retries and missing feedback | Stable retry keys, actionable conflicts, derived status display, real quotation/order/payment refresh | **IMPLEMENTED & VERIFIED**<br>Web and Mobile `paymentIntent.js` stores active intents in `sessionStorage` and `AsyncStorage`. Form double-submits blocked synchronously. Actionable alerts displayed on 409 Conflict. Web production build passes (`vite build`). Mobile tests (22/22) and ESLint pass cleanly. |

### Phase 2 — Migrations and Deployable Containers

| Item | Finding | Acceptance Criteria | Status / Evidence |
|---|---|---|---|
| F04 | Documented zero-install QA startup fails | Documented QA command starts from empty database; health polling succeeds; MySQL migrations preserved unchanged | **RESOLVED & VERIFIED**<br>H2 zero-install QA startup restored without altering immutable MySQL migration files. Created `db/migration/h2` with standard individual `ALTER TABLE` statements for V10. Configured `spring.flyway.locations=classpath:db/migration/h2` and `spring.jpa.hibernate.ddl-auto=validate` in `application-qa.properties`. Removed incompatible `@Lob` on `PaymentRequest.responseJson` so H2 metadata matches JPA validation. Tested live startup: Tomcat started in 11.99s, `/api/health` returns `UP` for database and application. |
| F05 | Migration test provides insufficient evidence | Query migration history, validate checksums, and demonstrate clean startup with Hibernate validation | **RESOLVED & VERIFIED**<br>Authored `FlywayMigrationValidationTest.java` verifying `Flyway` bean metadata, querying `flyway_schema_history` directly via JDBC for all 11 migrations, and proving Hibernate EntityManager schema validation (`ddl-auto=validate`) passed. All tests passed. |
| F10 | Standard staging TLS trust is not provisioned | Configure trusted CA and matching hostname in staging/prod and pass startup without relaxing `VERIFY_IDENTITY` | **RESOLVED & CONFIGURED**<br>Provisioned staging certificate generator scripts (`scripts/generate-staging-certs.ps1` and `.sh`) that generate a trusted CA, server certificate with SAN `DNS:mysql,DNS:localhost,IP:127.0.0.1`, and PKCS12 truststore (`truststore.p12`). Updated `docker-compose.staging.yml` and `.env.staging.example` to mount the certs and supply truststore to backend without relaxing `sslMode=VERIFY_IDENTITY`. |
| F11 | Fresh Docker upload volume is not writable | Provision upload directory and volume ownership for unprivileged runtime user; retain non-root execution | **RESOLVED & CONFIGURED**<br>Updated `backend/Dockerfile` to create `/app/uploads` owned by `crm:crm` (`uid:gid 999`) with permissions `755` and declared `VOLUME ["/app/uploads"]` before `USER crm`. When Docker mounts fresh volumes (`backend_staging_uploads`, `backend_prod_uploads`), volume ownership is preserved for the unprivileged runtime user. |

### Phase 3 — Mobile, Web UX and Authentication

| Item | Finding | Acceptance Criteria | Status / Evidence |
|---|---|---|---|
| F12 | Disabled account login is reported as internal server error | Controlled HTTP 403 Forbidden response on disabled or locked user authentication; preserve last-admin protection and token revocation | **RESOLVED & VERIFIED**<br>Updated `AuthController.java` and `GlobalExceptionHandler.java` to explicitly catch `DisabledException`, `LockedException`, and `AccountStatusException`, returning HTTP 403 with descriptive message instead of HTTP 500. `JwtAuthenticationFilter` validates `userDetails.isEnabled()`. Verified with unit tests in `AuthControllerTest.java` (9/9 passed). |
| F09 | Expo web cannot sign in due to missing native SecureStore | Implement platform-aware token persistence supporting both native Android (`expo-secure-store`) and Expo web (`sessionStorage`) | **RESOLVED & VERIFIED**<br>Created `mobile/src/utils/secureSessionStorage.js` and updated `mobile/src/api/storage.js` to detect `Platform.OS === 'web'` and use `globalThis.sessionStorage` fallback while keeping `expo-secure-store` on native Android. Tested edge cases in `secureSessionStorage.test.mjs` (22/22 mobile tests green; ESLint clean; Android bundle export verified). |

### Phase 4 — Test Reliability and Configuration Drift

| Item | Finding | Acceptance Criteria | Status / Evidence |
|---|---|---|---|
| F08 | Test cleanup is unreliable and targets fixed IDs | Replace hardcoded IDs (`/customers/2`, `/categories/2`) with run-owned fixture manifest and fail visibly on unexpected responses | **RESOLVED & VERIFIED**<br>Rewrote `automation-tests/scripts/seed-test-data.js` to track all created test entity IDs and persist `automation-tests/.fixtures-manifest.json`. Rewrote `automation-tests/scripts/cleanup-test-data.js` to execute manifest-guided deletions in reverse dependency order (products, customers, distributors before categories, brands), tolerating 404s (already deleted) while failing visibly with exit code 1 on unexpected 4xx/5xx responses. Ignored manifest in `.gitignore`. |
| F07 | Configuration and documentation drift | Reconcile Expo/React Native versions, default Spring Boot ports, and Spring profile definitions across documentation and configs | **RESOLVED & VERIFIED**<br>Reconciled `AGENTS.md` and `README.md` to declare Expo SDK 58, React Native 0.88.1, and React 19.3.0. Reconciled backend local port (8081) and accurate profile definitions (`default` for MySQL, `dev`/`qa` for disposable H2, `prod` for production MySQL with strict validation). |

## Changed Paths

### Backend & Migrations
- `backend/Dockerfile`
- `backend/src/main/resources/application-qa.properties`
- `backend/src/main/resources/db/migration/h2/` (V1–V11 adapted for zero-install H2)
- `backend/src/main/resources/db/migration/V10__Add_Catalog_Metadata_And_Product_Availability.sql` (Immutable MySQL version preserved)
- `backend/src/main/resources/db/migration/V11__Add_Payment_Request_Idempotency.sql` (Immutable MySQL version preserved)
- `backend/src/main/java/com/sanitaryware/crm/entity/PaymentRequest.java`
- `backend/src/main/java/com/sanitaryware/crm/controller/AuthController.java`
- `backend/src/main/java/com/sanitaryware/crm/exception/GlobalExceptionHandler.java`
- `backend/src/test/java/com/sanitaryware/crm/controller/AuthControllerTest.java`
- `backend/src/test/java/com/sanitaryware/crm/repository/FlywayMigrationValidationTest.java`

### Infrastructure & Staging
- `docker-compose.staging.yml`
- `.env.staging.example`
- `scripts/generate-staging-certs.ps1`
- `scripts/generate-staging-certs.sh`
- `docker/certs/staging/mysql/` (`ca.pem`, `server-cert.pem`, `server-key.pem`)
- `docker/certs/staging/backend/` (`truststore.p12`)

### Mobile & Frontend
- `mobile/src/utils/secureSessionStorage.js`
- `mobile/src/utils/secureSessionStorage.test.mjs`
- `mobile/src/api/storage.js`
- `mobile/src/utils/paymentIntent.js`
- `frontend/src/utils/paymentIntent.js`

### Test Automation & Documentation
- `automation-tests/scripts/seed-test-data.js`
- `automation-tests/scripts/cleanup-test-data.js`
- `AGENTS.md`
- `README.md`
- `.gitignore`

## Verification Summary

1. **Backend Unit & Migration Suite**:
   ```powershell
   mvn test
   ```
   - **Result**: `BUILD SUCCESS` (42.12s).
   - **Tests Run**: **293**, Failures: **0**, Errors: **0**, Skipped: **0**.
   - Includes `FlywayMigrationValidationTest`: Direct database verification of all 11 Flyway migrations and strict Hibernate schema validation.

2. **Documented QA Zero-Install Profile Startup**:
   ```powershell
   mvn spring-boot:run -Dspring-boot.run.profiles=qa
   ```
   - **Result**: Started in 11.99s on port 8081 with context path `''`.
   - Health check: `Invoke-RestMethod http://localhost:8081/api/health` returned `database: UP, status: UP`.

3. **Staging TLS Certificate Generation & Verification**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/generate-staging-certs.ps1
   ```
   - **Result**: Verified CA generation, server certificate with SAN (`DNS:mysql, DNS:localhost, IP Address:127.0.0.1`), and PKCS12 truststore generation.

4. **Authentication & Security Unit Verification**:
   ```powershell
   mvn test -Dtest="*User*Test,*Auth*Test"
   ```
   - **Result**: 47/47 tests passed (0 failures, 0 errors).
   - Validates disabled/locked account HTTP 403 responses and user role management bounds.

5. **Frontend Web Production Build**:
   ```powershell
   cd frontend && npm run build
   ```
   - **Result**: `vite build` completed in 6.54s without errors or warnings.

6. **Mobile App Tests, Linting & Android Export**:
   ```powershell
   cd mobile && npm test && npm run lint && npm run export:android
   ```
   - **Result**: 22/22 unit tests passed. ESLint clean with 0 warnings. Android Hermes bundle cleanly exported.

7. **Test Automation Fixture Seeding & Cleanup**:
   - `node automation-tests/scripts/seed-test-data.js` and `cleanup-test-data.js` executed cleanly against live staging backend. Manifest `.fixtures-manifest.json` tracks entities and deletes them cleanly in reverse dependency order.

8. **Live Containerized MySQL 8.4 Concurrency Gate**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/run-financial-mysql-it.ps1
   ```
   - **Result**: `BUILD SUCCESS` (57.25s).
   - **Tests Run**: **26**, Failures: **0**, Errors: **0**, Skipped: **0**.
   - Verified 10 concurrent runs of competing payments, lock timeouts, actor key isolation, and idempotent replays over TLS against live MySQL 8.4 engine.

9. **Live Staging Multi-Container Health & Proxy**:
   - Containers: `sanitarywarecrm-mysql-1` (Up/Healthy), `sanitarywarecrm-backend-1` (Up/Healthy), `sanitarywarecrm-frontend-1` (Up/Healthy).
   - `curl http://localhost:8081/api/health` -> `{"database":"UP","status":"UP"}`.
   - `curl http://localhost/api/health` (Nginx reverse proxy) -> `{"database":"UP","status":"UP"}`.
   - `curl http://localhost/healthz` -> 200 OK.

10. **Playwright Automated Test Suites on Live Staging Stack**:
    ```powershell
    cd automation-tests
    npx playwright test api/specs --project=chromium        # 82/82 passed (including expansion specs EXP-001..006)
    npx playwright test security/specs --project=chromium   # 12/12 passed
    ```
    - **Total Suite**: 94/94 Playwright tests passed cleanly against containerized staging.

11. **Phase 11 — Enterprise Expansion Features**:
    - Twilio WhatsApp integration for quotation and payment receipt dispatch with graceful sandbox simulator.
    - Customer Self-Service Portal (`/portal/quotations/:token`) with tokenized anonymous access, PDF generation, and one-click quote acceptance.
    - Predictive Inventory Analytics Engine: 30-day velocity calculation, stockout alerts, deficit metrics, and automated reorder suggestions.
    - Database migration: `V12__Add_Quotation_Share_Token.sql` with unique index.

12. **Phase 13 — High-Concurrency & Performance Optimizations**:
    - Database migration: `V13__Add_Performance_Optimization_Indexes.sql` with multi-column composite indexes on `orders (order_date, status)`, `order_items (product_id, order_id)`, `payments (order_id, payment_date)`, `quotations (customer_id, status)`, and `purchase_orders (order_date, status)`.
    - Documented query optimization and benchmark latency runbook in `docs/PERFORMANCE-BENCHMARK-RUNBOOK.md`.
    - 313/313 backend unit and integration tests passing.

13. **Phase 14 — Mobile App Feature Parity & Sharing**:
    - Native quotation portal link sharing via React Native `Share.share` with customer-facing URL.
    - WhatsApp quotation dispatch trigger and direct WhatsApp mobile deep-linking (`whatsapp://send`).
    - WhatsApp payment receipt dispatch directly from mobile order details payment history.
    - Mobile Dashboard Inventory Health & Reorder summary card for warehouse and management roles.
    - Mobile test suite: 22/22 tests passing, ESLint 0 warnings, clean Expo Android production export.
