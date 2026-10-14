# gstack Project Review

### Latest preflight and audit refresh — 14 October 2026, 07:36 UTC

Read-only checks confirmed backend health, frontend, and mobile-web endpoints returned HTTP 200. The four required QA password variables are absent from the current PowerShell process (values were not read), free physical memory is 808 MiB, Maven Central DNS/TCP 443 is reachable, and Docker's Linux engine pipe is unavailable. Root verification was withheld: the script checks credentials, then replaces the top-level summary and runs Android debug/release; native builds are unsafe at current memory.

Fresh `npm audit --audit-level=high` results: frontend 11 advisories (6 high, 5 moderate; exit 1), mobile 32 (21 high, 11 moderate; exit 1), automation 0 (exit 0). `npm explain` traced frontend findings through Tailwind/chokidar/fast-glob, Vite/esbuild, PostCSS, and React Router; mobile findings through Expo CLI/node-forge, Jest/argparse/js-yaml/sprintf-js, xcode/uuid, and Jest/Metro/braces. No dependency changes were made; major Tailwind/Vite/Router migrations and incompatible Expo/RN/Metro updates remain unapproved.

GitHub CLI is absent, and the MySQL workflow has no manual dispatch; its triggers are main/release pushes and PRs targeting main. No eligible CI result exists for this unpushed branch, so MySQL/Testcontainers remains blocked. Latest suite evidence is unchanged: backend 282/282, frontend 12/12 plus build, mobile 5/5 plus lint at 07:26 UTC; Playwright 156/156 and bug-hunt 22/22 at 06:36 UTC. No authenticated manual browser pass was available. Catalogue images remain authenticated-only by source and test evidence; formal CSO was not run. Production readiness remains false.

## Current-status addendum: 14 October 2026

### Fresh independent rerun — 14 October 2026, 07:26 UTC

Fresh checks completed in this pass: backend 282/282, frontend unit 12/12 and production build, mobile unit 5/5 and ESLint. Frontend/mobile `npm audit --audit-level=high` returned exit 1 with 11 advisories (6 high, 5 moderate) and 32 (21 high, 11 moderate); automation audit returned exit 0 with 0 advisories. No dependency changes were made. The Playwright 156/156 and bug-hunt 22/22 results remain from 06:36 UTC, not this pass.

The root summary is still historical and incomplete (19 passed / 1 failed / 0 skipped); a separate earlier expanded run recorded 19 passed / 7 failed, so these are different runs, not contradictory counts for one run. Root verification was not run because required QA password variables are absent and the script proceeds into native Android builds. Only 862 MiB RAM was free at preflight, below the configured 1 GiB Gradle heap; Android debug/release remain not run. Docker reported `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; ... The system cannot find the file specified.` No eligible MySQL CI run exists for this unpushed branch. Manual QA was not extended: Aside is unavailable and Windows Application Control blocked gstack's browser binary. The gstack CSO launcher is absent, so formal CSO is not assessed. Overall status remains **not production-ready**.

### Current gate reconciliation — 14 October 2026, 06:51 UTC

Current test evidence is the 06:36 UTC follow-up in `reports/verification-summary.json`: backend 282/282, frontend unit 12/12 and build, mobile unit 5/5 and lint, Playwright 156/156 (Chromium, Pixel 5, iPhone 13/WebKit), bug-hunt 22/22. Frontend audit is 11 (6 high/5 moderate), mobile 32 (21 high/11 moderate), automation 0. The root summary remains historical/incomplete at 19 passed / 1 failed / 0 skipped; do not merge counts from different runs into one total. Older 275-backend and 33-mobile-advisory figures below refer to earlier runs and are superseded for current status.

The verifier was not run: this PowerShell process lacks the four QA password variables and would stop at preflight. If credentials are added, it overwrites the top-level summary and reaches Android native builds. Free RAM is now about 1,007 MiB, so Android debug/release were withheld; Maven Central DNS/TCP 443 works but no fresh Gradle result exists. Docker/Testcontainers is blocked by the unavailable Desktop Linux engine. The configured `mysql-migration-verification` job is not triggered for this branch by current workflow filters (push main/release or PR targeting main); no remote run was started. Manual coverage remains partial, with no new authenticated browser evidence. Catalogue image access is authenticated-only; the old public-image claim was corrected. Overall verification remains incomplete.

### Fresh diagnostic and browser follow-up — 14 October 2026, 06:23 UTC

The newest full automated run remains the 06:09 UTC follow-up: backend 282/282; frontend unit 12/12 and build; mobile unit 5/5 and lint; Playwright 156/156; bug-hunt 22/22. These are green component/browser suites, not a green root verification. The root ledger remains `completed: false`, 19 passed / 1 failed / 0 skipped steps and 488 runner-reported passes; Android native debug is the failed step. Gradle's original failure was Maven Central DNS resolution while fetching `com.squareup:javapoet:1.13.0`. DNS/TCP 443 recovered by 14 October, but native retry was held because free physical memory was about 696 MB and prior release compilation exhausted resources. MySQL/Testcontainers is blocked by the missing Docker Desktop Linux engine named pipe. Run the existing MySQL CI job remotely and record its actual result; do not infer success from workflow configuration.

Current frontend/mobile audits are 11 (6 high, 5 moderate) and 32 (21 high, 11 moderate), respectively. Assess leaf/transitive patches without force flags; Tailwind 4, Vite 8, and React Router 7 require migration approval; Expo/RN/Metro need an aligned supported SDK train. Automated security/browser tests are not a formal CSO certification.

Focused manual QA on 14 October as ADMIN in in-app Chromium covered all six report tabs, audit-log actor filter/reset and an existing order/payment form inspection. No payment was submitted; no records were modified. No console/network logs were captured. This is not exhaustive role/device coverage. Services responded (backend health UP, frontend :5173 and Expo web :8082 HTTP 200). Project verdict remains **not production-ready / release gates unresolved**. No commit, push, or deployment occurred. Older verdicts and matrices below are historical evidence only.

### Historical fresh follow-up — 14 October 2026, 06:09 UTC

Freshly passed: backend 282/282, frontend unit 12/12 and build, mobile unit 5/5 and lint, Playwright 156/156, bug-hunt 22/22, automation health, scoped cleanup, and `git diff --check`. The focused ADMIN browser quotation flow confirmed list/form rendering, QA customer and seeded product selection, and recalculated totals; no quotation was saved. This does not constitute exhaustive manual QA. Audits remain unresolved (frontend 11, mobile 32); MySQL integration is blocked by the unavailable Docker Desktop Linux engine; Android native debug/release were not rerun. Root summary remains incomplete and historical (19 passed/1 failed steps), so production readiness is not established. See the newest entry in [reports/verification-summary.json](../reports/verification-summary.json).

**Historical retest attempt — superseded by the 06:36 UTC test follow-up.** At that earlier point the MySQL migration integration test errored before assertions and API/browser/viewport/bug-hunt/seed/cleanup did not execute because credentials/services were unavailable. Do not present those blocked results as the current suite status; the later follow-up recorded Playwright 156/156 and bug-hunt 22/22 passing.

**Historical expanded root-run inventory — backend 275 (13 October run).** This per-run suite count is retained as history and is not the current backend unit result (282/282 on 14 October). Catalogue images require authenticated access; financial dashboard data is limited to ADMIN/MANAGER. The historical run also recorded passing legacy E2E 7, frontend Chromium 43, mobile viewport 16, database-named 4, security 17, and bug-hunt 22; Android debug failed on transient Maven DNS, release was stopped for low memory, and MySQL lacked Docker. Current audit totals are 11/32/0 as summarized above. This remains neither exhaustive manual/hardware coverage nor formal CSO certification.

### Approved remediation follow-up - 14 October 2026

- Dashboard `recentOrders` now serializes a role-safe DTO. Only ADMIN/MANAGER receive nested order totals; SALES and WAREHOUSE receive no nested subtotal, tax, total, paid, or balance fields. A service-level serialization test covers all four roles with a populated order.
- Catalogue cleanup requires an exact batch ID, remains restricted to `dev`/`qa` and ADMIN, and deactivates only products created by that batch. It removes only image links owned by the batch, preserves image bytes while any product references them, and queues failed byte deletion for retry. Migration V11 tracks image ownership, including images linked to pre-existing products; V12 adds cleanup retry tasks.
- Import `createdCount`/`updatedCount` now increment only after persistence. Image failures are reported separately as `imageLinkFailures` and do not relabel a saved product as skipped.
- No commit, push, or deployment was performed. This is not a production-readiness verdict; full root, app/browser, MySQL, native Android, and audit verification remain outstanding.

### Historical full retest attempt - 14 October 2026 (superseded by 06:36 UTC follow-up)

- Passed: backend 282/282, frontend unit 12/12, frontend production build, mobile unit 5/5, mobile lint, Android JS export. `git diff --check` passed.
- Blocked before execution: Playwright/API/mobile viewport/bug-hunt, seed, and cleanup required `QA_ADMIN_PASSWORD`; it was absent. Backend, frontend, and Expo URLs were unavailable. An isolated service launch was rejected by the execution environment, so no credentials or services were created.
- Environment failure: MySQL Testcontainers integration reported `Could not find a valid Docker environment` (1 integration test error, 0 skipped).
- Audits: frontend 11 (6 high/5 moderate), mobile 32 (21 high/11 moderate), automation 0. No forced upgrades.
- No commit, push, or deployment. The complete verification remains partial, not green.

Date: 2026-10-11
Branch: `frontend-redesign`
Base: `origin/main` at `1332115`
Head: `b5ab6a5`

## Historical verdict (2026-10-11; superseded by the current-status addenda)

Status: **REMEDIATION COMPLETE; FINAL VERIFICATION GREEN**

The repository builds and the final verification passes across backend, frontend, API, database, security, unit, bug-hunt, Chromium, Pixel 5, and iPhone 13/WebKit coverage. An earlier Windows Application Control failure was reproduced and documented; the latest full rerun launched WebKit successfully.

Indicative gstack health score: **6.3/10**

This is an evidence score, not a product certification. It is reduced by browser regressions, unresolved dependency advisories, and incomplete production-equivalent verification.

## Review scope

| gstack capability | Result | Evidence |
|---|---|---|
| autoplan | Applied as the review orchestrator | CEO/design/DX/engineering concerns consolidated here |
| health | Completed | Maven, frontend tests/build, mobile tests/lint, diff checks |
| review | Completed | Branch diff against `origin/main`, 75 files, 3,973 additions and 7,605 deletions |
| cso | Completed | Secret/configuration scan, authorization census, upload/path review, dependency audit |
| devex-review | Completed | README, manifests, setup scripts, test commands, environment friction |
| design-review | Completed at available browser/UI surface | Registration snapshot, responsive bug-hunt evidence, release E2E failures |
| qa-only | Completed from existing full QA run | 142 release tests plus 22 bug-hunt tests |
| benchmark | Completed as lightweight browser timing pass | Login/register/dashboard navigation timing and bundle sizes |
| retro | Completed from branch history | Recent commit shape, large redesign change, test debt |
| document-generate | Applied to this report only | Full project review report, not feature documentation |

Skills not applicable to this repository review: iOS QA/design/sync/clean/fix, Figma skills, Render deployment skills, Vercel deployment/product skills, slides/PDF/spreadsheet/document connectors, pets, image generation, scraping, and external-agent pairing. They require targets or services this repository does not contain.

## Historical verification matrix (2026-10-11 baseline)

| Check | Result |
|---|---|
| Backend Maven/JUnit | 243 passed, 0 failed, 0 skipped |
| Frontend unit tests | 5 passed |
| Frontend production build | Passed; 1,589 modules transformed |
| Mobile unit tests | 1 passed |
| Mobile ESLint | Passed |
| Playwright frontend E2E | 36 passed, 0 failed |
| Playwright API/database/security | 75 + 4 + 11 passed, 0 failed |
| Playwright bug-hunt | 22 passed, 0 failed |
| Mobile viewport | Pixel 5: 8 passed; iPhone 13: 8 passed |
| Playwright bug-hunt suite | 22 passed, 0 failed of 22 |
| Backend health endpoint | Passed on port 8081 |
| Test data seed | Passed; existing duplicate data handled by seed script |
| Git whitespace check | Passed |
| Frontend browser timing | `/login` first navigation ~4.4s DOM ready in dev run; `/register` ~145ms; `/dashboard` redirected to login ~82ms |
| Frontend bundle | 342.27 kB JS / 101.92 kB gzip; 30.91 kB CSS / 7.34 kB gzip |

## P0/P1 release blockers

### Resolved: Full Chromium browser rerun

The final frontend release rerun passed 36/36. This includes attachments, audit logs, dashboard, reports, categories, customers, distributors, quote-to-invoice/payment, orders, products, purchase orders, quotations, and reports.

Affected areas include attachments, audit logs, customers, dashboard, distributors, quote-to-invoice flow, login errors, orders, payments, products, purchase orders, quotations, and reports.

Fix order:

1. Replace broad selectors such as `a:has-text("Add Product"), button:has-text("Add Product")` with stable role/name selectors scoped to the correct page region.
2. Define a UI contract for headings, alert roles, empty states, button names, and data attributes.
3. Update either the implementation or the tests, then rerun the full release suite.

### Resolved: Role-navigation contracts

Warehouse `Orders`, Admin `Distributor Payments`, Sales product search, Brands access, and unauthorized direct-route behavior now pass the role-aware bug-hunt suite. Backend authorization remains authoritative.

### Resolved: Mobile Safari verification

An earlier run failed before test logic with Playwright WebKit `spawn UNKNOWN`. The browser cache was present and `npx playwright install webkit` completed, but a direct process-start probe returned `Win32Exception (4551): An Application Control policy has blocked this file`.

Windows Code Integrity events 3033 and 3077 identified the same executable as failing enterprise signing requirements / violating policy ID `0283ac0f-fff1-49ae-ada1-8a933130cad6`; Smart App Control events were also recorded. File permissions, PowerShell execution policy, and TEMP write access were valid. The latest explicit matrix rerun passed all 142 tests, including all 8 iPhone 13 tests. Keep the Linux CI job as portability coverage and retain the prior Windows evidence if the policy failure recurs.

## P2 security findings

### P2: Dependency advisories need a planned upgrade

Frontend Axios and source-map-js were upgraded to compatible patched versions. **Historical audit snapshot:** frontend 11 advisories (6 high, 5 moderate); mobile 33 (22 high, 11 moderate). The newer 14 October audit snapshot reports frontend 11 (6 high, 5 moderate), mobile 32 (21 high, 11 moderate), automation 0. Treat 33/22 as an earlier point-in-time result only.

Do not run `npm audit fix --force` blindly. Create a dependency upgrade branch, upgrade Expo/React Native-compatible versions, rerun unit/build/E2E checks, and review lockfile changes.

### Resolved: Development/QA credentials have code defaults

`DevQaUserInitializer` now requires `QA_ADMIN_PASSWORD`, `QA_MANAGER_PASSWORD`, `QA_SALES_PASSWORD`, and `QA_WAREHOUSE_PASSWORD` through `application-qa.properties`; startup fails rather than silently selecting a shared password.

### Resolved: Public diagnostic endpoint remains enabled

`GET /api/auth/test` and its unauthenticated security matcher were removed. `/api/health` remains the public health contract.

### Resolved: CSP clickjacking directive is delivered in a meta tag

`frame-ancestors` was removed from the HTML meta CSP and added to the Nginx HTTP response header alongside `X-Frame-Options: DENY`.

### Resolved: Product image downloads require authentication

The earlier finding that `/api/files/download/products/**` was public is stale. `FileDownloadAuthorizationService` requires a current authenticated user before allowing catalogue image paths, and `FileDownloadAuthorizationServiceTest.catalogueImagesRejectAnonymousAccess` asserts anonymous denial. The browser security suite also checks anonymous rejection and successful image loading by all four authenticated roles. Keep this behavior aligned with the approved internal-CRM policy; do not make product images public without an explicit product decision.

## Code and architecture review

- Backend layering, DTO usage, method security, Flyway migration discipline, and production environment references are generally aligned with the repository rules.
- The backend test layer is strong: 243 tests pass across controllers, services, repositories, security, mappers, and utility code.
- The frontend redesign is a high-churn change: 75 files differ from `origin/main`, with several page files having hundreds of lines changed. This increases regression risk and makes the current Page Object drift unsurprising.
- The current test architecture has strong API/security coverage but too few frontend unit tests for shared UI components and page-level state transitions.
- The mobile quotation utility is now an explicit `.mjs` module; the previous module-type warning is gone without changing Expo configuration.

## Developer experience review

Strengths:

- README and automation README document the major services, ports, seed, health, and test commands.
- Backend includes a bundled Maven distribution, reducing setup dependency on a global Maven install.
- Health and seed scripts are useful and self-healing for local QA data.

Friction:

- The normal project workflow depends on Windows/OneDrive filesystem behavior and elevated permissions for local servers, Playwright artifacts, and Maven paths.
- `npm test` runs release specs plus mobile projects but does not run bug-hunt specs; this is not obvious from the top-level project workflow.
- There is no single root command that runs backend, frontend, mobile, API, security, database, and bug-hunt checks and writes one summary.
- The browser test suite relies heavily on text/CSS selectors instead of stable semantic selectors or `data-testid` contracts.

Recommended DX work:

1. Add a root verification script that runs all suites and prints a machine-readable summary.
2. Add a `TESTING.md` with the exact required service startup order, credentials source, browser install, and cleanup steps.
3. Add CI jobs for backend, frontend, API/security/database, browser Chromium, and mobile viewport checks.
4. Move QA passwords to CI environment variables and remove code-level defaults.

## Design and UX review

The registration surface is clear and exposes full name, username, email, phone, password, role, and the primary action. The responsive bug-hunt recorded no horizontal overflow at 375, 390, 768, 1366, or 1920 pixel widths for dashboard, products, and settings.

The main UX concern is consistency during interaction: expected buttons, headings, error alerts, empty states, and data controls are not stable enough for the tested workflows. Users may see a page that visually loads but cannot complete the action because the action control is absent or ambiguous.

## Retro and delivery review

- The branch is two commits ahead of `origin/main`; this remediation pass is intentionally uncommitted and unpushed pending user approval.
- The most recent work combines a large visual redesign, backend hardening, QA artifacts, and test fixes. That mix makes regression isolation harder.
- The next delivery should split UI contract repairs from dependency upgrades and from deployment changes.
- The project has good backend test discipline but needs a stronger browser regression loop after every large page redesign.

## Remediation changes in this pass

- Added stable role/test-id contracts for primary navigation, dashboard metrics, report tabs, empty/error states, and audit controls; changed Page Objects away from broad text selectors.
- Made Warehouse Orders visible while preserving item-level authorization and renamed the admin payment navigation to Distributor Payments.
- Fixed multi-child `Field` rendering, which previously crashed order and purchase-order forms at runtime.
- Fixed report response normalization to consume the backend's direct DTO responses and render the expected metric/table structure.
- Fixed authenticated bill-pad upload handling with local blob previews and an explicit uploaded-reference link.
- Added root `npm run verify`, machine-readable summary output at `reports/verification-summary.json`, and `TESTING.md`.
- Added deterministic unpaid-order setup for payment E2E, stable product-search contracts, and fixed the product-image runtime crash caused by a missing `IconButton` import.
- Upgraded compatible frontend Axios and source-map-js versions; no force upgrades were used.

## Recommended next sequence

1. Keep the Linux CI WebKit job enabled as cross-platform protection.
2. Plan compatible frontend/mobile dependency upgrades; do not use force upgrades without lockfile and E2E review.

## Phase 1 follow-up - 2026-10-12

- Resolved the manual QA duplicate-action finding on the Customers empty state. The page-header and empty-state actions now expose distinct accessible names and stable test IDs; the customer Page Object targets the primary action directly.
- Enabled the compatible React Router future flags for `v7_startTransition` and `v7_relativeSplatPath`; the frontend unit suite and production build pass after the change.
- Added a QA/dev-only catalogue cleanup contract. Newly created imported products carry a batch marker; `npm run cleanup` deactivates those products and removes generated catalogue images without touching existing products updated by an import. Imported category rows remain for referential safety.

## Durable learnings

- This project’s reliable backend verification command is `backend/apache-maven-3.9.6/bin/mvn.cmd test`; global Maven is not guaranteed.
- The final application-facing inventory is 413 tests: 243 backend, 5 frontend unit, 1 mobile unit, 75 API, 36 frontend E2E, 4 database, 11 security, 22 bug-hunt, and 16 mobile viewport tests. The repository does not contain 500 distinct executable tests.
- The frontend redesign requires semantic selector contracts because duplicate link/button labels cause strict-mode failures.
- Playwright WebKit is preserved in the suite and passed in the latest complete local verification; the earlier Windows Application Control block remains documented as an environment-only contingency.
- No production secrets or default QA passwords remain in application or automation source. QA credentials are required through environment variables. The Linux CI workflow also installs WebKit and runs the preserved iPhone 13 project.

## Verification rerun - 2026-10-12

The current authenticated rerun completed green: root verification recorded 14 passed, 0 failed, and 0 skipped steps in `reports/verification-summary.json` at `2026-10-12T14:19:26.1970116Z`. It includes backend 243/243, frontend unit 5/5 plus production build, mobile unit 1/1 plus lint, API 75/75, frontend E2E 36/36, mobile viewport 16/16 across Chromium, Pixel 5, and iPhone 13, database 4/4, security 11/11, bug-hunt 22/22, health, seed, and cleanup. Frontend audit remains 11 advisories (6 high, 5 moderate); mobile audit remains 33 advisories (22 high, 11 moderate). The last frontend failure was POS-073 image upload and was fixed by making the file input event handling and test synchronization stable.

Manual catalogue import was revalidated after the importer fix with the disposable PDF `【Split】 DOC-20260724-WA0015.pdf`. The refreshed QA backend returned HTTP 200 in approximately 69.4 seconds with a batch ID, 1,293 created, 5 updated, 1,298 total processed, 1,212 linked images, and zero skipped rows. QA cleanup deactivated exactly 1,293 imported products. The importer now validates price bounds, avoids a batch-wide transaction rollback from one bad row, and the modal preserves backend failures in an accessible alert.

## Fresh independent verification — 2026-10-14 06:36 UTC

Backend tests passed **282/282**; frontend unit tests **12/12** and production build passed; mobile unit tests **5/5** and lint passed; Playwright passed **156/156** across Chromium, Pixel 5, and iPhone 13/WebKit; bug-hunt passed **22/22**. Frontend audit has **11 advisories (6 high, 5 moderate)**; mobile has **32 (21 high, 11 moderate)**; automation has **0**. Frontend/mobile audit commands remain non-green at `--audit-level=high`.

Root verification was not rerun; its historical **19 passed / 1 failed / 0 skipped** result remains unresolved (Android debug). MySQL/Testcontainers is blocked by the unavailable Docker Desktop Linux engine pipe. Android native builds were not run for host-resource safety. Automated browser coverage passed, but exhaustive manual QA across all roles/workflows has not been completed. See the latest timestamped entry in `reports/verification-summary.json`; overall completion remains false. No commits, pushes, or deployments were performed.

## Follow-up diagnostics — 2026-10-14 06:41 UTC

Read-only inspection confirmed that the root verifier checks the four required `QA_*_PASSWORD` variables before writing a new top-level summary; with those variables absent, it would stop at preflight without overwriting the report. If credentials are supplied, it writes a new summary and proceeds through Android debug and release before MySQL/audit checks. It was not run: the current PowerShell process lacks those variables, free physical RAM is about 1.2 GB, and the configured Gradle heap is 1 GB before native toolchain overhead. Maven Central TCP/443 is currently reachable, but that does not by itself prove Gradle resolution or a successful debug build. Docker still cannot connect to `npipe:////./pipe/dockerDesktopLinuxEngine`.

The configured GitHub Actions job is `mysql-migration-verification` on `ubuntu-latest` and runs `cd backend && mvn verify -Pmysql-integration`; no remote CI run was initiated or verified here. Current audit trees show frontend fixes proposed by npm cross Tailwind 4, Vite 8, and React Router 7 major migrations; mobile suggestions point to Expo/RN versions outside the current SDK 55 / React Native 0.83.10 train. No upgrades were applied. The existing QA password environment variables were not read or disclosed. The existing browser tab could not be inspected because the browser-control call timed out, so no new manual QA is claimed. See `reports/verification-summary.json` for this diagnostic-only entry; its historical root summary was preserved.
