# Sanitaryware CRM Full QA Report

## Latest preflight and audit refresh — 2026-10-14 07:36 UTC

Diagnostic only; no test suites were rerun. Backend `/api/health`, frontend `:5173`, and mobile-web `:8082` returned HTTP 200. Required QA password variables are absent (values not read), free memory is 808 MiB, Maven Central DNS/TCP 443 is reachable, and Docker's Linux engine pipe remains unavailable. The root verifier was inspected but withheld because it overwrites the top-level summary after credential preflight and invokes Android native debug/release; current memory is inadequate.

Fresh audits: frontend 11 advisories (6 high, 5 moderate; exit 1), mobile 32 (21 high, 11 moderate; exit 1), automation 0 (exit 0). Dependency paths were inspected; no upgrades were made. GitHub CLI is absent, and no manual-dispatch trigger exists for the MySQL workflow, so no CI result can be claimed. Latest tests remain backend 282/282, frontend 12/12 plus build, and mobile 5/5 plus lint from 07:26 UTC; Playwright 156/156 and bug-hunt 22/22 from 06:36 UTC. Manual browser QA remains partial, formal CSO was not run, and production readiness remains blocked.

## Current-status addendum: 14 October 2026

### Fresh independent rerun — 14 October 2026, 07:26 UTC

Backend passed 282/282, frontend unit passed 12/12 and production build passed, mobile unit passed 5/5 and ESLint passed. Fresh audits: frontend 11 advisories (6 high, 5 moderate; exit 1), mobile 32 (21 high, 11 moderate; exit 1), automation 0 (exit 0). Playwright 156/156 and bug-hunt 22/22 are prior 06:36 UTC evidence; neither was rerun here. No test was skipped or weakened and no dependency upgrade was made.

Root verification remains not rerun and historically incomplete (19 passed / 1 failed / 0 skipped in the top-level summary). Another earlier expanded run recorded 19 passed / 7 failed; retain it as a distinct historical run. Root verification is unsafe to start in this shell: required QA password variables are absent, free memory was 862 MiB against a 1 GiB Gradle heap, and the script invokes Android native builds. Docker's Linux engine named pipe is unavailable, so MySQL/Testcontainers and its Ubuntu CI job remain unresolved. Browser/manual testing was not extended because Aside is unavailable and Application Control blocked the installed gstack browser; authenticated role testing remains partial. The trusted CSO launcher is not installed, so formal CSO coverage is **not assessed**. Production readiness remains blocked.

### Current gate reconciliation — 14 October 2026, 06:52 UTC

Latest test evidence remains 06:36 UTC: backend 282/282; frontend 12/12 and build; mobile 5/5 and lint; Playwright 156/156 across Chromium, Pixel 5, and iPhone 13/WebKit; bug-hunt 22/22. Latest audit files report frontend 11 (6 high/5 moderate), mobile 32 (21 high/11 moderate), automation 0. Do not combine the historical 19/1 root step counts with these later suite runs. The root summary remains incomplete and its top-level timestamp is older than its follow-up entries.

At 06:52 UTC, free RAM was about 1,007 MiB, Maven Central DNS/TCP 443 were reachable, the four QA password variables were absent from this PowerShell process, and Docker could not connect to `npipe:////./pipe/dockerDesktopLinuxEngine`. Root verification and Android native builds were not run. The MySQL workflow has no `workflow_dispatch`, only push to main/release or PR targeting main; GitHub showed no PR-triggered workflow run for current HEAD `b5ab6a5f207ec803dba72da63376214d53a08f64`. No CI run can be claimed. Manual browser access was not verified as authenticated, so no new manual pass is claimed. Catalogue image access is authenticated-only, as code and tests require. Overall release readiness remains blocked.

### Fresh diagnostic and browser follow-up — 14 October 2026, 06:23 UTC

The latest full automated evidence remains the 06:09 UTC rerun: backend 282/282, frontend unit 12/12 plus production build, mobile unit 5/5 plus lint, Playwright 156/156 across configured projects, and bug-hunt 22/22. Root verification remains incomplete at 19 passed / 1 failed / 0 skipped steps and 488 runner-reported tests; the failed step is Android native debug, not an application test assertion.

The Android debug log reports Gradle could not resolve `com.squareup:javapoet:1.13.0` because Maven Central DNS failed. DNS and TCP 443 probes succeeded on 14 October, but the build was not retried: available physical memory was about 696 MB versus a configured 1 GB Gradle heap, and the previous native release compile approached resource exhaustion. MySQL migration/Testcontainers remains blocked because Docker cannot connect to `npipe:////./pipe/dockerDesktopLinuxEngine` (file not found). The existing Linux CI MySQL job is the recommended execution path; it has not been remotely verified.

Fresh audits remain frontend 11 advisories (6 high, 5 moderate) and mobile 32 (21 high, 11 moderate), no critical findings. Automation's most recent audit was 0 advisories but was not rerun in this follow-up. Do not use force upgrades. Tailwind 4, Vite 8, and React Router 7 are major migrations; Expo, React Native, and Metro must be upgraded as a compatible SDK train. Check compatible leaf/transitive fixes separately and rerun dependent tests.

Manual browser follow-up (14 October, authenticated ADMIN, Codex in-app Chromium): all six Reports tabs rendered data; Audit Logs heading, filters, refresh and pagination appeared. Filtering Actor=`qamanager` returned 12 events; Reset restored 20 of 535 and page 1 of 27. An existing order detail and its payment form loaded, including payment amount/date/method/reference/notes controls. No receipt was submitted and no record was created or changed. No console/network evidence or screenshot file was captured. This is focused QA, not exhaustive role or browser coverage. No new product defect was confirmed in this pass.

The backend health endpoint and frontend/mobile-web ports returned successfully (backend `/api/health` UP; frontend 5173 and mobile web 8082 HTTP 200). The working tree remains intentionally dirty. No commit, push, or deployment was performed. See the latest `followUpVerifications` item in [verification-summary.json](../reports/verification-summary.json) for structured diagnostics.

### Historical fresh follow-up — 14 October 2026, 06:09 UTC

Freshly passed: backend 282/282, frontend unit 12/12 and production build, mobile unit 5/5 and lint, Playwright 156/156, bug-hunt 22/22, automation health, scoped cleanup, and `git diff --check`. Frontend audit: 11 advisories (6 high, 5 moderate); mobile audit: 32 (21 high, 11 moderate). MySQL migration integration remains environment-blocked because the Docker Desktop Linux engine pipe is unavailable; Android native debug/release were not rerun. Root verification remains incomplete (historical 19 passed/1 failed steps), not green.

ADMIN manual browser check: the quotations list and new quotation form rendered; selecting the previously verified QA customer and `E2E-TEST-SKU` product showed stock 100 and recalculated line/subtotal/tax/net total as ₹220/₹220/₹39.60/₹259.60. The quotation was not saved. This is a focused workflow check, not exhaustive manual QA. The browser screenshot was visible during the session but was not saved as a file artifact. Afterward, the documented cleanup command succeeded with explicit customer ID 1 and category ID 1 only; zero catalogue batches were supplied. These are the previously inspected disposable QA customer/category fixtures. Product/brand fixtures remain active because this cleanup command has no product/brand inputs; no unrelated records were changed. Exact follow-up data is in `reports/verification-summary.json`.

**Historical retest — superseded for API/browser/viewport/bug-hunt status by the 06:36 UTC follow-up.** At this earlier checkpoint the root summary was incomplete (19 passed / 1 failed / 0 skipped; 488 runner-reported passes), backend 282, frontend 12/build, mobile 5/lint and Android JS export passed; MySQL errored before assertions because Docker was unavailable; API/browser suites did not execute due missing credentials/services. The later 06:36 UTC follow-up records Playwright 156/156 and bug-hunt 22/22 passed. Preserve this paragraph as the earlier run’s result, not current coverage.

**Historical expanded root-run suite inventory — backend 275.** This was the backend count from that specific earlier root run. The later independent backend suite passed 282/282. The historical run also recorded frontend unit 12, legacy E2E 7, mobile unit 5, remediation 12, API 75, Chromium 43, viewport 16, database-named 4, security 17, and bug-hunt 22. Do not treat its per-suite numbers as the 06:36 follow-up’s inventory. Audit totals at that later point are frontend 11, mobile 32, automation 0. The payment race fix and its regression remain recorded evidence.

User-approved policy: catalogue images require authentication, and company-wide financial dashboard fields are limited to ADMIN/MANAGER. Exhaustive manual authenticated testing and physical-device native testing remain incomplete. No commit or push performed.

### Approved remediation findings and implementation - 14 October

- Dashboard response now uses a safe recent-order projection: management roles get order totals, while SALES/WAREHOUSE do not receive nested financial values. Populated-data serialization tests cover all four roles.
- Catalogue QA cleanup is batch-specific (`DELETE /api/qa/catalogue-imports/{batchId}`), QA/dev-only, and ADMIN-only. It deactivates only products created by the selected batch; batch-owned image links are removed even when attached to an existing product, while shared files are preserved. Failed byte deletion is persisted for retries.
- Product import counts now represent persisted product rows. Image storage/link errors increment a separate `imageLinkFailures` count.
- No commit/push/deploy. Full manual QA and complete environment-dependent verification are still outstanding.

### Full retest - 14 October 2026

**Historical credential/service-blocked attempt (superseded for browser suite status by later 06:36 UTC evidence).** Backend 282/282, frontend 12/build, mobile 5/lint, Android JS export and diff check passed; MySQL errored before assertions due unavailable Docker. Playwright/API/viewport/bug-hunt/seed/cleanup were blocked at that time because `QA_ADMIN_PASSWORD` and app services were unavailable. Later evidence recorded Playwright 156/156 and bug-hunt 22/22 passed. Do not report the earlier blocked state as the newest result.

### Historical status (13 October)

Current approved security policy supersedes the historical public-image statement: all catalogue image access requires login; company-wide dashboard finances are ADMIN/MANAGER only. Prior expanded Chromium frontend 40, Pixel 8, iPhone 8, backend 275 and security 17 tests passed. Focused real Expo follow-up passed 9 workflow, 10 module and 4 role checks with zero page errors and 112 owned records cleaned. A new real-backend customer-search regression failed before the application guard and passed afterward. Native compiler memory/page-file failures, unavailable Docker for real MySQL, unresolved advisories (frontend 11/mobile 32; automation 0), incomplete main-suite ownership tracking, and exhaustive manual/hardware verification remain separate blockers/limitations. Screenshots are in `reports/expo-*.png`. No commit or push performed.

Date: 2026-10-11
Branch: `frontend-redesign`
Environment: local Spring Boot QA JAR on `8081`, Vite frontend on `5173`, Playwright Chromium/Mobile projects

## Historical executive result (2026-10-11; superseded by the current-status addenda)

This document records the final post-remediation verification. Chromium, API, database, security, unit, mobile Pixel 5, bug-hunt, and iPhone 13/WebKit coverage are clean. An earlier Windows Application Control failure was reproduced and documented; the latest full rerun launched WebKit successfully.

The repository contains 413 executable automated tests across the backend, frontend, mobile, release Playwright, and bug-hunt suites. The final explicit browser run executed 142 tests: 142 passed. The separate bug-hunt workflow executed 22 tests: 22 passed and 0 failed. Backend, frontend unit, mobile unit, frontend production build, and mobile lint checks passed.

The final frontend release rerun passed 36/36. The explicit browser matrix passed 142/142. The explicit bug-hunt rerun passed 22/22.

## Manual browser follow-up - 2026-10-12

An authenticated ADMIN Chromium pass covered all 15 protected routes at the desktop browser size and iPhone 13-sized viewport. The dashboard and primary form flows were additionally checked at 1366x768 and 1920x1080. All tested routes rendered without horizontal overflow. All six Reports tabs were opened successfully. The Product Catalog PDF bulk-import dialog was opened and its required brand/file/disabled-submit states were verified. The detailed evidence and limitations are recorded in [docs/manual-complete-functional-qa-2026-10-12.md](manual-complete-functional-qa-2026-10-12.md).

Manual follow-up resolved the duplicate Add Customer accessibility ambiguity, the React Router future-flag console warnings, and the catalogue cleanup blocker. Catalogue imports now mark newly created products and `npm run cleanup` removes their active/product-image footprint in QA/dev without touching existing products updated by an import. MANAGER, SALES, and WAREHOUSE mutation/authorization workflows remain explicitly unverified in this browser session and are not claimed as passing.

## Historical test matrix (2026-10-11 baseline)

| Suite | Executed | Passed | Failed | Skipped | Result |
|---|---:|---:|---:|---:|---|
| Backend Maven/JUnit | 243 | 243 | 0 | 0 | PASS |
| Frontend Node tests | 5 | 5 | 0 | 0 | PASS |
| Mobile Node tests | 1 | 1 | 0 | 0 | PASS |
| Playwright API suite | 75 | 75 | 0 | 0 | PASS |
| Playwright frontend E2E suite | 36 | 36 | 0 | 0 | PASS |
| Playwright database suite | 4 | 4 | 0 | 0 | PASS |
| Playwright security suite | 11 | 11 | 0 | 0 | PASS |
| Playwright bug-hunt suite | 22 | 22 | 0 | 0 | PASS |
| Mobile viewport suite | 16 | 16 | 0 | 0 | PASS |
| **Total** | **413** | **413** | **0** | **0** | **PASS** |

The repository does not currently contain more than 500 distinct executable test cases. The requested “500+” coverage is not present in the configured test inventory; many tests contain multiple assertions and workflow steps.

## Historical passed checks (2026-10-11 baseline)

- Backend compile and tests: `mvn test`, 243/243 passed, BUILD SUCCESS.
- Frontend unit tests: 5/5 passed.
- Mobile unit tests: 1/1 passed.
- Frontend production build: `vite build` passed, 1,589 modules transformed.
- Mobile lint: `eslint .` passed.
- Backend health check passed on `http://localhost:8081/api/health`.
- QA seed completed successfully. Existing duplicate seed data was handled by the seed script.
- Release API, frontend, database, and security Playwright coverage passed in the final granular run.
- API, frontend role, and responsive bug-hunt checks passed 22/22.
- Root `npm run verify` wrote `reports/verification-summary.json` with 14 passed and 0 failed steps.

## Resolved release-suite failures

### Frontend selector and UI contract failures

- `attachments.e2e.spec.js`: order attachment flow timed out because the expected file input/upload response was not found.
- `audit-logs.e2e.spec.js`: audit page heading did not match `Audit Trail & System Logs` in two tests.
- `customers.e2e.spec.js`: Add Customer locator matched both link and button, causing strict-mode failures in two tests.
- `dashboard.e2e.spec.js`: Dashboard Page Object uses broad `h2` selector; current page has four section headings and no unique Dashboard heading match.
- `distributors.e2e.spec.js`: Add Distributor locator matched both link and button.
- `full-crm-flow.e2e.spec.js`: Add Product locator matched both link and button.
- `login.e2e.spec.js`: invalid-password test did not find `.error-message` or `.alert-danger`.
- `orders.e2e.spec.js`: no invoice download button/order row was available.
- `payments.e2e.spec.js`: no matching unpaid order/manage link was available.
- `products.e2e.spec.js`: Add Product and Categories locators matched multiple elements; product details/edit controls were missing or unavailable; expected `GST: 18%` text differed from rendered `GST 18%`; empty-state text and duplicate-barcode feedback did not match.
- `purchase-orders.e2e.spec.js`: purchase-order distributor select did not become visible.
- `quotations.e2e.spec.js`: New Quotation locator matched both link and button in two tests.
- `reports.e2e.spec.js`: expected heading `Financial & Operational Reports` was not found.

All previously reported Chromium failures were fixed or updated to the confirmed product contract: selectors are scoped to roles/test ids, payment tests create a deterministic unpaid order, product image upload/delete is functional, and quotation/purchase-order workflows pass.

### Mobile environment failure

- Pixel 5 dashboard, invalid-login, navigation, product, and smoke tests: 8/8 pass.
- All 8 Mobile Safari/iPhone 13 tests passed in the final rerun.
- The executable exists and is complete, but a direct process-start probe returns Windows `Win32Exception (4551): An Application Control policy has blocked this file`.
- Code Integrity events 3033 and 3077 report that the executable fails enterprise signing requirements / violates policy ID `0283ac0f-fff1-49ae-ada1-8a933130cad6`; Smart App Control events are present. Permissions, execution policy, and TEMP write access were not blockers.

## Resolved bug-hunt failures

- Warehouse navigation, Admin Distributor Payments, Sales product search/Brands, and unauthorized route behavior pass in the final 22-test bug-hunt run.

## Findings and priority

1. Environment: retain Linux CI coverage and monitor for recurrence of the previously observed Windows Application Control block.
2. Frontend audit: 11 advisories (6 high, 5 moderate); fixes shown by npm require breaking Tailwind/Vite/React Router upgrades.
3. **Historical mobile audit snapshot:** 33 advisories (22 high, 11 moderate). Superseded by the later 14 October audit JSON: 32 (21 high, 11 moderate). Use the timestamped JSON for current totals.
4. Plan compatible dependency upgrades; do not use `npm audit --force`.

## Evidence

Playwright screenshots, videos, and error contexts are in `automation-tests/test-results/`. The HTML report is in `automation-tests/reports/` when generated by the configured reporter.

The final evidence and machine-readable step summary are in `reports/verification-summary.json` (generated locally and ignored by Git).

## Security decisions

- Product image downloads require authentication. `FileDownloadAuthorizationService` first requires a current user, the focused service test rejects anonymous catalogue-image requests, and the Playwright security spec checks anonymous denial plus successful downloads for all four authenticated CRM roles. The older claim that these images were public is stale; keep access private/no-store and use the authenticated image API adapter.
- CSP is delivered through the production-style Nginx response header, including `frame-ancestors 'none'`; the HTML meta policy no longer carries that directive.
- No production secrets or default QA passwords are committed. Automation credentials now come from required `QA_*_PASSWORD` or `TEST_*_PASSWORD` environment variables. The Linux CI workflow supplies secrets and runs the iPhone 13 WebKit project.

## Independent verification rerun - 2026-10-12

The current authenticated rerun completed all required automated layers. Root verification recorded 14 passed, 0 failed, and 0 skipped steps in `reports/verification-summary.json` at `2026-10-12T11:37:27.0369747Z`: backend 243/243, frontend unit 5/5, production build, mobile unit 1/1, mobile lint, API 75/75, frontend E2E 36/36, mobile viewport 16/16, database 4/4, security 11/11, bug-hunt 22/22, health, seed, and cleanup. Frontend audit reported 11 advisories (6 high, 5 moderate); mobile audit reported 33 advisories (22 high, 11 moderate). No tests were weakened, skipped, or deleted.

The final frontend E2E defect was POS-073 image upload; the file input now handles both input event paths and the test waits for the edit form/image section before interacting. The targeted test and complete root verification passed after the fix.

Manual catalogue import was revalidated after the importer fix. The disposable PDF returned HTTP 200 in approximately 69.4 seconds with a batch ID, 1,293 created products, 5 updated products, 1,298 total processed, 1,212 linked images, and zero skipped rows. `npm run cleanup` deactivated exactly 1,293 imported products. The modal now preserves backend errors in an accessible alert when a request fails.

## Latest authenticated QA rerun — 2026-10-12

Root verification completed at `2026-10-12T15:06:24.0636409Z` with 14 passed, 0 failed, and 0 skipped steps. The rerun passed backend 243/243, frontend unit 5/5, frontend build, mobile unit 1/1, mobile lint, API 75/75, frontend E2E 36/36, mobile viewport 16/16, database 4/4, security 11/11, bug-hunt 22/22, health, seed, and cleanup. A broader Playwright invocation completed 142/142 across Chromium, Mobile Chrome (Pixel 5), and Mobile Safari (iPhone 13/WebKit).

Fresh manual browser sessions confirmed successful ADMIN, MANAGER, SALES, and WAREHOUSE authentication, role-filtered navigation, and Access denied rendering for SALES/WAREHOUSE direct Settings access. No console error-level entries were observed. `git diff --check` passed. No commit or push was performed.

## Fresh verification follow-up — 2026-10-14 06:36 UTC

Fresh local reruns passed backend **282/282**, frontend unit **12/12** and production build, mobile unit **5/5** and lint, Playwright **156/156** across Chromium, Pixel 5, and iPhone 13/WebKit, and bug-hunt **22/22**. The frontend, mobile, and automation audits were rerun: frontend has **11 advisories (6 high, 5 moderate)**, mobile **32 (21 high, 11 moderate)**, automation **0**. The frontend and mobile audit commands exit nonzero at `--audit-level=high`; no force upgrades were performed.

This does not make root verification green. The historical root summary remains **19 passed / 1 failed / 0 skipped** and was not rerun: the failed step is Android debug, previously blocked by transient Maven Central DNS, and root verification also attempts native Android builds. Fresh Docker probing confirms the Docker Desktop Linux engine named pipe is unavailable, so MySQL/Testcontainers remains blocked. Android native debug/release were not run in this follow-up for host-resource safety. Browser automation is green, but manual browser coverage is still focused rather than exhaustive. See the latest timestamped entry in `reports/verification-summary.json`; overall `completed` remains false.

## Follow-up diagnostics — 2026-10-14 06:41 UTC

No test suite was rerun in this diagnostic pass. The root script was inspected and left untouched; it requires `QA_ADMIN_PASSWORD`, `QA_MANAGER_PASSWORD`, `QA_SALES_PASSWORD`, and `QA_WAREHOUSE_PASSWORD` in the current process before writing a replacement top-level summary. Those variables are absent here, so it would stop at preflight without overwriting the report. If provided, the script then reaches native Android debug/release before Docker and audit checks. Free physical RAM is approximately 1.2 GB, and Android release is not safe to retry here. Maven Central TCP/443 currently responds, but a fresh Gradle debug build has not been demonstrated. Docker/Testcontainers remains blocked by the missing Docker Desktop Linux engine pipe. The configured Linux CI job is named `mysql-migration-verification`; no remote run was started. Catalogue-image policy was cross-checked against the authorization service and tests and is authenticated-only. Existing browser inspection timed out; no additional manual QA is claimed. The latest automated counts remain those in the 06:36 UTC summary follow-up, and the overall gate remains incomplete.
