# Sanitaryware CRM repository assessment

Assessment date: 10 November 2026 (Asia/Calcutta). Scope: current local working tree, including pre-existing uncommitted changes. Release and bug-hunt suites have completed; Expo web smoke follow-up is recorded separately below. No application source was changed, committed, or pushed for this assessment.

## Current verdict

**Do not release the assessed tree yet.** Three independently reproduced integrity problems affect payments and inventory, and the documented QA startup fails during migration V10. Successful builds and unit tests do not cover these failures.

Manual Windows/browser interaction is **blocked**, not passed. The requested Computer Use helper stopped because it could not confidently determine Chrome's URL for policy enforcement. Chrome and in-app/cloud browser fallbacks reported `The browser access host is unavailable`; this session exposes no separate VS Code cloud-browser tool. No Computer Use manual login or native Android testing has been completed. Automated browser tests must not be represented as manual interaction. Screenshots produced by the Expo automated smoke were visually reviewed to diagnose its login failure.

## Verified checks

| Check | Result | Meaning and limit |
|---|---|---|
| Backend `mvn test` | PASS: 289 tests, 42 suites, zero failures/errors/skips | Existing unit/controller/repository checks; not a production MySQL startup test |
| Frontend `npm run build` | PASS | Vite 5.4.21; 1,583 transformed modules; main JS 390.86 kB / gzip 106.44 kB |
| Frontend `npm test` | PASS: 5 tests | Utility tests only; does not establish component or workflow coverage |
| Mobile `npm run lint` | PASS | Static lint check |
| Mobile `npm test` | PASS: 16 tests | Includes secure storage migration, session races, request ordering, totals and Metro exclusions |
| Mobile `npm run export:android` | PASS | 2,747 modules; Hermes bundle about 4.2 MB; export is not an APK or device acceptance test |
| Documented QA startup | FAIL | V10 SQL rejected by H2; server unavailable |
| QA startup with command-line `--spring.flyway.enabled=false` | PASS | Disposable H2 + Hibernate schema; used only to inspect workflows; not a fix or migration validation |
| `npm run health` on disposable QA | PASS | Backend and database report UP |
| `npm run seed` on disposable QA | PASS | Created brand, category, product, customer and distributor |
| Docker daemon | AVAILABLE on follow-up | Initial named-pipe connection failure was transient; user correction prompted a fresh check confirming Engine 29.8.2 / Compose 5.6.0 |
| Docker builds | PASS with frontend context workaround | Backend image built as configured; frontend built from identical inputs outside OneDrive after original context failed |
| Standard staging startup | FAIL | Backend exits on MySQL certificate trust validation |
| MySQL 8.4 Flyway + Hibernate validate | PASS in isolated diagnostic configuration | V1–V10 succeeded in actual Flyway history; prod schema validation enabled; encrypted connection with certificate verification relaxed only for this diagnostic |
| Container routing/bootstrap/login | PASS in diagnostic configuration | Nginx `/healthz`, proxied `/api/health`, SPA `/products`, bootstrap 201, login 200 |
| Container file upload | FAIL | Authenticated CSV upload returned 500; upload volume is not writable by runtime crm user |
| MySQL/Nginx release suite, origin-corrected | 140 PASS / 4 FAIL | 124 desktop/API/security/database passes and 16 mobile-viewport passes; 3 upload failures and 1 shared-fixture payment failure; no skips/flaky outcomes |
| Isolated eligible payment UI on MySQL/Nginx | PASS | Fresh order through portal; paidAmount=10, balanceAmount=90 and PARTIAL verified through real API |
| MySQL logical backup/restore | PASS for all 20 base tables | `mysqldump --single-transaction --no-tablespaces --routines --triggers`; restored into a separate schema; every source/restored table checksum matched |
| Full stack stop/start persistence | PASS | All 40 source/restored checksum rows unchanged across MySQL/backend/Nginx stop/start; Flyway validated V1–V10 and found schema current |
| Token revocation after restart | PASS | Previously logged-out token still rejected with 401; health and fresh login return 200 |
| Full Playwright release suite | PASS: 144/144; zero skipped/flaky/unexpected | 128 chromium tests plus 8 Pixel 5 and 8 iPhone 13 viewport tests; 610 seconds; disposable QA with Flyway disabled |
| Separate bug-hunt suite | PASS: 26/26; zero skipped/flaky/unexpected | 11 API negatives and 15 frontend/responsive checks; about 80 seconds; same disposable QA environment |
| Expo web isolated smoke API phase | PASS | Real quotation, conversion, payment and refreshed balance verified sequentially |
| Expo web isolated smoke UI phase | FAIL/BLOCKED at login | Warm retry screenshot shows missing SecureStore function; downstream UI scenarios not reached |
| npm production dependency audits | Frontend: 4 findings (2 high, 2 moderate); mobile: 5 moderate | Registry advisory findings, not proof of exploitable application paths; no automatic dependency changes applied |

Maven was absent from PATH but recovered from the existing Maven 3.9.14 wrapper cache. That environment issue is resolved for this assessment. Existing dependencies were used; clean `npm ci` reproducibility has not been established.

## Reproduced defects and priorities

### F01 — Concurrent payments corrupt aggregate balances — P0

Evidence: `audit-artifacts/audit-probes-results.json`, probe `concurrent-payment`. On a fresh order with total 100 and paid amount 0, submit two authenticated `POST /api/payments` requests simultaneously, each for amount 60 and method CASH. In the retained five-attempt run, four attempts returned 200 for both requests. Each affected order had two ledger entries of 60, but its header said `paidAmount=60`, `balanceAmount=40`. Accepted receipts total 120 against an order of 100.

Relevant implementation: `PaymentServiceImpl.recordPayment` reads with ordinary `OrderRepository.findById`, validates the old balance, then saves the incremented aggregate. `Order` has no `@Version`; the repository has no payment-specific locked lookup. A transaction alone does not serialize this read/validate/write sequence.

Impact: incorrect receipts, overpayment acceptance, misleading customer balances and reports. Similar supplier balance update patterns warrant investigation, but supplier races have not been dynamically reproduced here.

MySQL follow-up confirms this is not an H2-only result: the same five-attempt probe against the Docker/MySQL 8.4 prod-profile backend reproduced the inconsistent two-receipt/one-increment result once. Three additional attempts produced one HTTP 500 response alongside one successful payment; one attempt correctly rejected the second payment with 400. Retained evidence: `audit-artifacts/mysql-integrity-probes-results.json`. Thus MySQL concurrency behavior is both financially inconsistent and prone to unhandled failures under this probe.

The MySQL runtime log identifies `Deadlock found when trying to get lock; try restarting transaction` for those concurrent failures. The service does not turn these into a controlled domain response/retry. Evidence: `audit-artifacts/docker-mysql-runtime.txt`.

Remediation target: serialize payment and reversal mutations for the same order, enforce reconciliation invariants, and add concurrent integration tests. Add idempotency for client retries separately; locking alone does not address duplicate retries. Acceptance: simultaneous payments cannot exceed the remaining balance and order totals always reconcile to the payment ledger.

### F02 — PUT order confirmation skips reservation; cancellation inflates stock — P0

Evidence: same probe file, `put-order-stock-reservation`. Create a product with stock 1000 and a PENDING order for quantity 1. `PUT /api/orders/{id}` with status CONFIRMED succeeds but stock remains 1000. Then `PATCH /api/orders/{id}/status?status=CANCELLED` succeeds and stock becomes **1001**.

Relevant implementation: `OrderServiceImpl.updateOrder` captures `stockReserved` from the old status and uses that old value for item stock adjustments after changing status. `updateStatus` separately implements reservation-boundary adjustments, creating inconsistent behavior between write paths.

Impact: overselling and phantom stock, even with sequential requests. Existing pessimistic product locks do not prevent incorrect reservation logic.

The identical 1000 → 1000 → 1001 sequence was also reproduced against Docker/MySQL 8.4; see `mysql-integrity-probes-results.json`.

Remediation target: centralize reservation transitions and item changes as one invariant-preserving operation. Acceptance: all status write paths reserve/restore exactly once; cancellation returns stock to its original value, never above it.

### F03 — Payment status can contradict actual balance — P1

Evidence: `manual-payment-status` probe. On an unpaid order for 100, `PATCH /api/orders/{id}/payment-status?status=PAID` returns 200 with `paymentStatus=PAID`, `paidAmount=0`, `balanceAmount=100`.

Relevant implementation: `OrderServiceImpl.updatePaymentStatus` directly assigns the enum without validating or deriving it from financial amounts. Controller allows ADMIN, MANAGER and SALES subject to order access.

Impact: fulfillment and reporting may trust a paid marker that has no corresponding payment. Treat manual reconciliation as an explicit audited domain action if the business requires it; do not let a label silently contradict balances.

The same contradictory `PAID`, paidAmount=0, balanceAmount=100 result was reproduced against Docker/MySQL 8.4.

Acceptance: ordinary payment status is derived from ledger amounts, or an explicit reconciliation workflow records an authorized financial adjustment and keeps all totals consistent.

### F04 — Documented zero-install QA startup fails — P1

Command: `mvn spring-boot:run -Dspring-boot.run.profiles=qa`.

Observed: migrations V1–V9 ran; V10 failed at its first `ALTER TABLE brands ADD COLUMN ..., ADD COLUMN ...` statement. H2 2.2.224 emitted SQL state/error 42000. The server did not start. Maven nevertheless printed `BUILD SUCCESS` and exit code 0 under the DevTools restart run, so exit code alone is an unreliable readiness signal here.

Source: `backend/src/main/resources/db/migration/V10__Add_Catalog_Metadata_And_Product_Availability.sql`. The same script has another multi-column ALTER for products. This is a reproduced H2 compatibility failure, **not evidence that MySQL rejects the script**.

No applied migration was modified. Decide migration ownership/application status before remediation, respecting the repository's immutable applied-migration rule. Acceptance: the documented QA command starts from an empty database, health polling succeeds, and MySQL migrations are independently exercised.

### F05 — Migration test provides insufficient evidence — P1 verification gap

`automation-tests/database/specs/flyway-migration.spec.js`, test POS-081, calls `/api/health` and asserts database UP. This can pass with Flyway disabled and a Hibernate-created schema. It does not query migration history, validate checksums, or demonstrate clean MySQL startup. Replace/extend the release gate with a disposable supported MySQL database, migrations V1 through current, and Hibernate validate after migration.

The adjacent `schema-validation.spec.js` has the same limitation: POS-082 checks health UP and comments that a schema mismatch would make health DOWN. The actual health controller checks database connectivity; connectivity does not prove Hibernate validation was enabled or the schema matches migrations.

### F06 — Production and operational checks remain unproven — release gate

At the initial environment check Docker could not connect to its daemon and no MySQL listener was present. **Follow-up correction:** Docker is now reachable (Engine 29.8.2 / Compose 5.6.0), and isolated MySQL 8.4 containers reached healthy status. The initial Docker outage must not be interpreted as a persistent project blocker. Container build/startup findings are recorded below. Local logical backup/restore now passes for all 20 base tables; production TLS deployment, off-site recovery and recovery objectives remain unverified. No claim of production readiness follows from H2 results.

Docker follow-up: the original frontend build context failed with `invalid file request src/hooks/useFilePreview.js` (the OneDrive file has a reparse-point attribute). Copying frontend inputs outside OneDrive produced a successful image, and the backend image also built successfully and specifies runtime user `crm`. The frontend copy respects `.dockerignore` exclusions and does not change source. The standard staging backend then exited with MySQL TLS trust failure: `Path does not chain with any of the trust anchors`. Staging uses the prod profile with `sslMode=VERIFY_IDENTITY` but does not provision trust for the MySQL container certificate. Resolve trusted CA/hostname provisioning; do not disable verification in production. A separately labelled local diagnostic run retains encryption with `sslMode=REQUIRED` solely to test migration/schema behavior. This override is not a release fix or a passing standard staging configuration. Evidence: `audit-artifacts/docker-build.txt`, `docker-frontend-normalized-build.txt`, `docker-backend-build.txt`, and `docker-backend-runtime.txt`.

Android SDK adb is installed, but `adb devices -l` returned an empty device list. No connected native runtime is available. An additional Expo web smoke attempt initially failed because its Playwright Chromium headless-shell revision was missing; browser installation/retry is separate from native-device acceptance.

The required Playwright Chromium revision was subsequently installed. The repository's Expo smoke retry then failed fixture setup with customer phone uniqueness conflict (HTTP 409); it uses fixed phone `9876543210`. An isolated copy of the harness uses a unique run phone with every original assertion preserved, to distinguish fixture collision from application behavior. Original smoke script and application source were not edited.

### F07 — Configuration/documentation drift — P2

AGENTS.md specifies Expo 55 / React Native 0.83.6; mobile/package.json specifies Expo 58 / React Native 0.88.1 and React 19.3.0. README describes an older mobile stack. AGENTS.md says dev uses MySQL while application-dev.properties uses disposable H2. Several instructions mention mobile API port 8080 while current defaults use 8081. Reconcile the supported stack and onboarding instructions.

Default application.properties also has a literal database-password fallback and a local JWT fallback. Production properties require environment substitution, so this is not evidence of a leaked live production credential. It is configuration debt and makes an accidentally omitted production profile riskier. JWT startup validation checks length and positive expiry, not rejection of known placeholder secrets.

### F08 — Test cleanup is unreliable and targets fixed IDs — P2

`automation-tests/scripts/cleanup-test-data.js` deletes customer 2 and category 2 regardless of which IDs seeding created. It treats non-success HTTP responses as success, catches failures and exits 0. It therefore cannot prove cleanup and is unsafe to run against a shared dataset. The initial phase used a newly created disposable in-memory QA database; the continuation used isolated MySQL named volumes. The cleanup script was reviewed rather than used to delete arbitrary IDs. Replace hardcoded IDs with a run-owned fixture manifest and fail visibly on unexpected responses.

Container follow-up also exposed shared-fixture assumptions: `frontend/specs/payments.e2e.spec.js` selects the first UNPAID order globally rather than creating its own eligible fixture. It selected a CANCELLED synthetic order from the integrity probes, then correctly failed to record payment. Do not count that selection failure as proof that normal eligible payments are broken; isolate test-owned fixtures and explicitly exclude non-payable states. Original assertions are preserved.

An independent fixture-isolated browser test subsequently created its own PENDING order for 100, recorded 10 through the real Docker web portal and verified PARTIAL status, paidAmount=10 and balanceAmount=90. Evidence: `audit-artifacts/mysql-isolated-payment-ui-results.json` and `mysql-isolated-payment-success.png`. This successful sequential workflow does not resolve the concurrent-payment defect.

### F09 — Expo web cannot sign in because token storage calls an unavailable native API — P1 for web target

After installing the missing Playwright browser and isolating the fixture phone number, a cold Expo web run timed out at its 60-second navigation limit while Metro compiled the first bundle (about 59 seconds). Its screenshot showed the login page. A subsequent warm run reached and submitted the login form, then timed out waiting for the dashboard. The retained screenshot displays `ExpoSecureStore.default.getValueWithKeyAsync is not a function` beneath the password field. No API responses were observed by the browser phase.

Source trace: `mobile/src/api/storage.js` unconditionally wraps Expo SecureStore; `mobile/src/utils/secureSessionStorage.js` calls `getItemAsync` without a platform availability path. The API interceptor reads the token before sending requests. Existing storage unit tests inject mocks and do not exercise the real web platform implementation.

Impact: the explicitly configured `npm run web` target and its UI smoke cannot sign in. The sequential API phase passed. This does not prove a native Android SecureStore failure. Acceptance: define a deliberate web session strategy or clearly remove unsupported web claims, retain native secure token storage, and exercise actual platform adapters in tests. Do not weaken native storage to make web tests green.

### F10 — Standard staging TLS trust is not provisioned — P1

Docker follow-up used the original staging services with an isolated project name, generated disposable credentials and loopback-only alternate host ports. MySQL became healthy but the prod-profile backend exited: `CertificateException` / `CertPathValidatorException: Path does not chain with any of the trust anchors`. `application-prod.properties` requires `sslMode=VERIFY_IDENTITY`; the staging Compose configuration does not provide the generated MySQL server CA as a trusted Java certificate or provision hostname-matching server identity.

A local diagnostic override of the Hikari sslMode to REQUIRED retained encrypted transport but relaxed certificate verification. With that explicitly non-release override, all ten Flyway migrations succeeded on MySQL 8.4, the history table records success=1 for V1–V10, and the application started with Hibernate `ddl-auto=validate`. This distinguishes the TLS staging blocker from SQL/schema compatibility. Acceptance: configure trusted CA and matching hostname in staging and production and pass startup without the diagnostic override. Evidence: `docker-backend-runtime.txt`, `docker-backend-diagnostic-runtime.txt`, `mysql-flyway-history.txt` under audit-artifacts.

### F11 — Fresh Docker upload volume is not writable — P1

The backend runs as uid/gid 999 (`crm`) as intended. On the fresh named volume, `/app/uploads` is `root:root` mode 0755 and `test -w /app/uploads` fails for the runtime user. A real authenticated CSV multipart upload through Nginx returned HTTP 500 with the generic error envelope. Bootstrap registration and login had succeeded immediately beforehand, so this is a downstream file-write failure rather than an authentication or routing failure.

Acceptance: provision upload directory and fresh-volume ownership for the unprivileged runtime user, retain non-root execution, and prove upload/download plus restart persistence on a fresh volume. Do not solve this by running the backend as root. Probe evidence: `audit-artifacts/docker-runtime-probe-results.json`.

### F12 — Disabled account login is reported as an internal server error — P2

On the Docker/MySQL backend, create a SALES user through the manager API, sign in successfully, deactivate through authorized user management, then attempt login with its correct credentials. Login returns HTTP 500 and `Login failed`. Its previously issued token is correctly rejected with 401, so access is not granted. `CustomUserDetailsService` marks the principal disabled, causing Spring's disabled-account authentication exception before AuthController's later inactive check; the broad catch maps that exception to 500. Return a controlled 401/403 authentication response without internal exception leakage. Evidence: `audit-artifacts/mysql-access-probes-results.json`.

The same probe also verified manager-to-ADMIN creation returns 403; manager-to-SALES creation returns 201; removing the last active admin returns 409; reactivated login succeeds; logout returns 204 and the logged-out token is rejected with 401. These are positive security results, distinct from the disabled-login status defect.

## Architecture and engineering assessment

The modular Spring Boot monolith is appropriate for this CRM's present scope. Controllers, services, repositories, DTOs, mappers and shared access-control logic provide useful boundaries. Splitting into microservices would not solve the demonstrated financial and inventory invariant failures; resolve those within the existing transaction model first.

Strengths verified in source: BCrypt password hashing; stateless JWT security; method security; sales ownership checks for orders/quotations; bootstrap locking; persisted token revocation; DTO validation; global error handling; pagination helpers; BigDecimal financial arithmetic; audit logging; pessimistic product locks and product optimistic versioning. Frontend uses centralized Axios, Zustand auth, role-aware routes and lazy-loaded larger pages. Mobile uses SecureStore for bearer tokens, AsyncStorage for non-token user data, request-order guards and session rejection tests.

Main design weaknesses: duplicated order mutation rules; balances maintained as mutable aggregates without consistent concurrency protection; manual status mutation independent of financial facts; unbounded payment list retrieval through findAll; database access inside mappers; field injection remains in major classes despite constructor-injection guidance. These increase correctness and maintenance costs. The full scale impact of unbounded queries and lazy relationships has not been load-tested.

ReportServiceImpl also loads full order/payment/purchase/product datasets with findAll and then filters in Java, even for date-limited reports. Push filtering and aggregation into repository queries, and add realistic volume tests before making capacity claims. Catalogue import has useful review tokens, conflict detection and batched existing-SKU lookup, with 39 passing parser/import unit tests; real supplier catalogue accuracy and 160 MB upload resource behavior remain untested. NotificationServiceImpl logs and swallows provider failures and skips unconfigured providers; delivery reliability, retries and user-visible delivery state need an explicit operational design. No emails or WhatsApp messages were sent during this assessment.

Security positives do not establish penetration-test completion. The login limiter is an in-process ConcurrentHashMap keyed by remote address and username; entries expire only when that key is revisited, and state is not shared between instances. Review memory bounds, proxy-aware identity and distributed deployment behavior. Web bearer tokens are in sessionStorage, limiting persistence but still accessible to injected JavaScript. Nginx adds several protective headers, but its static asset location adds its own headers; verify effective inherited headers in a running container. HTTPS termination/CSP and external integration delivery were not tested.

Container header probes now verify this inheritance gap: the HTML document has the configured security headers, while its `/assets/index-*.js` response lacks X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy. The asset does receive immutable cache headers. This is a configuration consistency issue; absence of frame policy on JavaScript alone does not prove a clickjacking vulnerability. Anonymous product access returns 401; configured-origin preflight returns 200 with matching allow-origin, and an untrusted-origin preflight returns 403 without allow-origin. Evidence: `audit-artifacts/docker-header-probe-results.json`.

The CI workflow runs backend, frontend and mobile checks, which is a useful foundation. Its QA backend startup uses a fixed sleep rather than readiness polling. Playwright's webServer command is Windows-specific (`cmd.exe`) while CI runs Ubuntu; it is normally bypassed if an already-started frontend is reused, but cold-start cross-platform behavior is fragile. The current QA migration failure is likely to obstruct CI runtime checks; this assessment did not execute GitHub Actions.

## Provisional ratings

Scale: 0 absent/unusable; 5 substantial implementation with material gaps; 8 strong verified readiness; 10 exceptional evidence across correctness, operations and scale. These are engineering judgments, not measured percentages or certifications. Unknown runtime areas lower confidence rather than being counted as passes.

| Direction | Score / 10 | Basis |
|---|---:|---|
| Backend structure and maintainability | 6.5 | Clear layering and 289 green tests; injection and mapper boundaries need consistency |
| Backend business correctness | 4.0 | Reproduced financial race, stock inflation, contradictory payment state |
| Frontend engineering | 7.0 | Successful build, central API/auth, role guards, lazy loading; 5 utility tests, 36 release E2E and additional responsive checks pass |
| Frontend usability/accessibility | Unrated | Manual visual, keyboard, screen reader and error-state verification blocked |
| Mobile engineering | 5.5 | Lint/tests/Android export pass; native secure storage and race protections; web login fails and native acceptance is unverified |
| System design | 6.0 | Suitable modular monolith; duplicated invariants and aggregate concurrency gaps |
| Database and migration readiness | 5.5 | V1–V10 and Hibernate validate now pass on MySQL 8.4 under diagnostic TLS settings; QA migration failure and standard staging TLS blocker remain |
| Security implementation | 6.0 | Multiple substantive controls; dependency findings and unverified deployment controls |
| Test strategy and confidence | 6.0 | 289 backend and 170 release/bug-hunt checks pass; important invariant and migration coverage gaps remain |
| Performance/scalability | 5.0 | Pagination/indexes exist; unbounded paths and no load/capacity evidence |
| Deployment/operations | 5.0 | Non-root backend and health checks; local restore/restart verified; standard TLS startup and fresh-volume uploads fail |
| Documentation/onboarding | 5.0 | Extensive instructions with stack/profile/port drift and failing documented startup |
| Overall current release readiness | 4.5 | Blocked by reproduced integrity defects; not an arithmetic average |

## Required follow-up acceptance work

1. Resolve payment concurrency and ledger reconciliation, order reservation transitions and payment-status invariants. Add tests covering both sequential and concurrent write paths; preserve existing assertions.
2. Restore documented QA startup. MySQL migrations V1–V10 and schema validation now pass in the diagnostic run; make standard staging TLS trust pass without that override. Do not rewrite applied migrations.
3. Preserve the now-green API/security/web/responsive suites and add the missing reproduced invariant cases. Complete remaining Expo and manual/native acceptance work; classify assertion failures separately from environment failures.
4. Restore Computer Use/cloud browser access and manually cover login/logout, all four roles, dashboard, customers, brands/categories, products/imports/attachments, quotations/conversion/PDF, orders/status/stock, payments/balances, distributors/purchases/supplier payments, reports, audit logs, settings/users/profile and unauthorized navigation. Resolve Expo web session support before treating its smoke as green.
5. On a real emulator/device, verify mobile login, persistence/expiry/logout, offline/retry, product picking, quotation/order/payment workflows, keyboard/back navigation and role visibility. Mobile-viewport Playwright tests exercise the React web portal, not the native Expo app.
6. Resolve the now-reproduced container TLS trust and upload-volume ownership failures. Diagnostic container/API routing, fresh MySQL migrations and local logical backup/restore pass; production HTTPS, upgrade from an existing deployment and off-site recovery remain outstanding. Validate environment values are non-default without exposing secrets.
7. Triage dependency advisories against actual usage and upgrade deliberately. No `npm audit --force` was used.

## Evidence and reproducibility

- Backend XML evidence: `backend/target/surefire-reports/TEST-*.xml` (42 suites / 289 tests).
- Dynamic probes: `audit-artifacts/audit-probes.cjs` and `audit-artifacts/audit-probes-results.json` (ignored local artifacts). Synthetic data only, on the disposable QA backend started for this audit.
- Dependency evidence: `audit-artifacts/frontend-npm-audit.json` and `audit-artifacts/mobile-npm-audit.json`.
- Full release suite command: `npx playwright test --project=chromium --project="Mobile Chrome (Pixel 5)" --project="Mobile Safari (iPhone 13)" --reporter=json --output=test-results/audit-2026-11-10`.
- Release results: `audit-artifacts/playwright-release-results.json`; per-test index: `audit-artifacts/playwright-release-summary.json`. Every selected release test reported expected status, with no skipped or flaky outcomes. This suite is narrower than the independent probes that reproduced the financial and stock defects.
- Release breakdown: API 76, database-labelled checks 4, frontend E2E 36, security 12, responsive web 16 (8 tests on each of two mobile viewports). Database-labelled checks use APIs and do not independently validate MySQL schema/migration history.
- Separate bug-hunt results: `audit-artifacts/playwright-bughunt-results.json` and `audit-artifacts/playwright-bughunt-summary.json`; 26 passed.
- MySQL/Nginx continuation: initial run `playwright-mysql-release-results.json` had 98 passes / 46 failures, largely caused by this audit's 127.0.0.1 browser origin differing from the configured localhost origin. The corrected-origin full run `playwright-mysql-release-origin-corrected.json` had 140 passes / 4 failures: product-image API upload, draft attachment upload, product-image UI upload, and the shared-fixture payment case. No assertions were weakened. All 16 mobile-viewport cases passed in that corrected run. Separate eligible-payment UI probe passed with a fresh fixture.
- Backup/restore evidence: `audit-artifacts/mysql-all-table-restore-comparison.json` compares all 20 base tables after restoring the logical dump into `crm_audit_restore`; every checksum matched. This proves this local logical restore, not an off-site recovery RTO/RPO or a backup retention policy. Dump and test-token files contain synthetic authentication data and remain ignored local artifacts.
- Restart evidence: `audit-artifacts/mysql-restart-data-comparison.json` records all 40 checksum rows unchanged after stopping and starting MySQL/backend/frontend. `mysql-restart-auth-results.json` records health=200, revoked token=401, fresh login=200. `docker-mysql-after-restart.txt` records Flyway validation and schema already current at V10.
- QA migration failure was reproduced again with an otherwise identical QA startup on port 8083, preserving logs in `audit-artifacts/qa-startup-failure.txt`; it again failed V10 while Maven exited successfully. No other server used port 8083.
- Expo smoke evidence: `audit-artifacts/mobile-ui-smoke-warm.txt`, isolated harness `audit-artifacts/mobile-smoke-isolated.mjs`, and screenshot `audit-artifacts/mobile-web-login-error.png`. The original harness failed fixture uniqueness; the isolated harness changed only dependency resolution, artifact paths and fixture phone, preserving original assertions. Legacy generic-module navigation was not enabled and is explicitly skipped by that script.
- Preserve the distinction between the unmodified documented startup failure and the command-line Flyway-disabled workflow environment. The workaround must never be treated as a release fix.

This report intentionally makes no claim that every repository path or end-to-end scenario has passed. Manual UI testing, native mobile acceptance, standard staging TLS startup and remaining operational validation are outstanding. Fresh MySQL migration/schema and diagnostic container checks have now been executed as documented above.

The earlier audit-started Vite frontend (5173), disposable H2 QA backend (8081) and Expo web development server (8082) were stopped during the MySQL continuation to free resources. The H2 test database was disposable; its retained evidence files remain available. All test datasets contain synthetic records, including intentionally inconsistent defect reproductions; do not interpret their report totals as real business data. The failed port-8083 startup process has exited.

Docker follow-up lifecycle: isolated project `crm-audit-20261110` used loopback host ports 13306/18081/18080 to avoid existing services. All three audit containers were stopped after checks; no existing user containers were stopped or removed. Audit images and named volumes were retained. Generated disposable credentials are stored only in ignored `audit-artifacts/docker-audit.env`; do not publish that file. No repository Dockerfile, Compose file, migration or application source was edited for this follow-up.

Further continuation used fresh project `crm-audit-next-20261110` with the same images and diagnostic TLS override, then created all test roles through authorized application APIs. Its containers were also stopped after the backup/restart checks; volumes, images and ignored evidence were retained. Repository test files and assertions were not modified. Temporary config files changed only the deployment target and artifact paths. The first container suite used the wrong audit origin, and its failed run is retained rather than counted as application failures; the corrected-origin run is the authoritative MySQL release-suite result.
