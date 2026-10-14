# CRM Development Progress and Verification

## Latest preflight and audit refresh — 14 October 2026, 07:36 UTC

- Backend health, frontend, and mobile-web returned HTTP 200. Maven Central DNS/TCP 443 was reachable; Docker's Linux engine pipe was unavailable.
- The four QA password variables were absent from this shell (values not read). Free memory was 808 MiB, below the configured 1 GiB Gradle heap. Root verification and Android native builds were withheld. The verifier writes/replaces the top-level summary after credential preflight and then invokes Android debug and release.
- Fresh audits: frontend 11 (6 high, 5 moderate; exit 1), mobile 32 (21 high, 11 moderate; exit 1), automation 0 (exit 0). Dependency paths were inspected; no package changes were made.
- GitHub CLI is absent; MySQL workflow dispatch is unavailable and its branch triggers exclude this unpushed branch. Testcontainers remains blocked pending an actual Ubuntu run of `cd backend && mvn verify -Pmysql-integration`.
- No authenticated browser session was verified; formal CSO was not run. Catalogue image access remains authenticated-only by source/test evidence.
- Latest passing tests are backend 282/282, frontend 12/12 plus build, and mobile 5/5 plus lint at 07:26 UTC. Playwright 156/156 and bug-hunt 22/22 are from 06:36 UTC. This was not a fresh full verification; production readiness remains false.

## Fresh independent rerun — 14 October 2026, 07:26 UTC

- Backend: **282/282 passed**.
- Frontend: **12/12 unit tests passed**; production build passed.
- Mobile: **5/5 unit tests passed**; ESLint passed.
- Dependency audit: frontend **11 (6 high, 5 moderate; exit 1)**; mobile **32 (21 high, 11 moderate; exit 1)**; automation **0 (exit 0)**. No upgrades were made.
- Earlier Playwright **156/156** and bug-hunt **22/22** remain 06:36 UTC results; not rerun in this pass.
- Root status remains historical/incomplete: top-level summary says **19 passed / 1 failed / 0 skipped**. A distinct earlier expanded execution recorded **19 passed / 7 failed**. Neither is a fresh root run.
- Root verifier withheld: QA password variables are absent; it runs native Android stages after preflight and may replace the top-level JSON. Free RAM at preflight was **862 MiB**, below its configured **1 GiB Gradle heap**, so Android native builds were also withheld.
- Docker/Testcontainers remains blocked by missing `npipe:////./pipe/dockerDesktopLinuxEngine`. MySQL CI has no eligible run on this unpushed branch. Manual QA not extended: Aside is unavailable and Windows Application Control blocks gstack's browser executable. Trusted CSO launcher is absent; formal CSO is **not assessed**.
- Verdict: **not production-ready** until MySQL migration CI, native Android release gates, unresolved high dependency advisories, formal security review, and remaining authenticated manual coverage are closed or explicitly accepted by the release owner.
- No commit, push, or deployment occurred.

## Current gate reconciliation — 14 October 2026, 06:52 UTC

Latest suite evidence is 06:36 UTC: backend 282/282; frontend 12/12 plus build; mobile 5/5 plus lint; Playwright 156/156 across Chromium, Pixel 5 and iPhone 13/WebKit; bug-hunt 22/22. Audits: frontend 11 (6 high/5 moderate), mobile 32 (21 high/11 moderate), automation 0. Historical backend 275 and mobile audit 33/22-high counts below belong to older specific runs and are superseded for current totals. Older credential/service-blocked statements describe an earlier checkpoint; they are superseded for the browser suite by the later 156/156 and 22/22 results. The root summary remains incomplete at 19/1/0 and 488 runner-reported passes; do not combine those counts with the later suite runs.

At 06:52 UTC: free RAM was approximately 1,007 MiB; Maven Central DNS and TCP/443 worked; the required QA password environment variables were absent from this PowerShell process; Docker's Linux engine pipe was missing. Root verification and Android native builds were not run. The GitHub Actions MySQL job has no manual dispatch, is filtered to main/release pushes or PRs targeting main, and there is no PR-triggered run for current HEAD. No commit or push was made, so this checkout's dirty changes are not covered by remote CI. Catalogue images are authenticated-only; the older public-image report claim is stale. Manual browser work remains partial because no authenticated session could be verified.

## Fresh diagnostics and manual follow-up — 14 October 2026, 06:23 UTC

- Reused existing services: backend `/api/health` UP, frontend `http://localhost:5173` HTTP 200, Expo web `http://localhost:8082` HTTP 200. No service restart was needed.
- Full suite counts remain from the 06:09 UTC run: backend 282, frontend 12, mobile 5, Playwright 156, bug-hunt 22 all passed; root verification remains incomplete at 19 steps passed / 1 failed / 0 skipped (488 runner-reported tests passed). This diagnostics pass did not rerun those suites.
- Android root failure: `mobile-android-debug` could not resolve `com.squareup:javapoet:1.13.0` after Maven Central DNS failure. Current DNS and TCP 443 checks succeed, but retry is unsafe with about 696 MB physical memory free; previous release compilation drove free memory down during concurrent Clang processes. Retry on a higher-memory CI runner after confirming Maven/Google repository connectivity; do not treat connectivity probes as build evidence.
- Docker diagnosis: `docker info` fails connecting to `npipe:////./pipe/dockerDesktopLinuxEngine` because the named pipe is missing. MySQL/Testcontainers migration test remains blocked. Execute `.github/workflows/ci.yml`'s `mysql-migration-verification` job on Linux and capture its actual result.
- Dependency audits: frontend 11 (6 high/5 moderate), mobile 32 (21 high/11 moderate), automation 0 from the latest earlier audit (not rerun here). No force upgrades. Frontend major migrations are required for current npm-proposed Tailwind 4, Vite 8 and React Router 7; Expo/RN/Metro must be aligned as a supported SDK train. Investigate compatible leaf fixes separately.
- Manual ADMIN browser check: six reports tabs rendered; audit actor filter returned 12 qamanager events; Reset restored 20 of 535. Existing order and payment entry UI inspected, no receipt submitted and no data changed. Console/network logs and full role/browser/device coverage were not obtained.
- No source or test changes were made in this follow-up. Reports/docs are updated as a dated status correction. No commit, push, or deployment was performed.

Client date: 13 October 2026. Work started on 12 October; execution timestamps below are retained as recorded, not rewritten to the client date.

Branch: `frontend-redesign`. Starting HEAD: `b5ab6a5f207ec803dba72da63376214d53a08f64`. No commit, push, merge, deployment, or applied-migration edit is authorized.

## Preservation and baseline

Read all 925 lines of `CRM_COMPLETE_MASTER_AUDIT_REPORT.md`. It is an inventory, not proof of current behavior.

Recoverable local checkpoint: `C:/Users/akhil/AppData/Local/Codex/checkpoints/SanitarywareCRM-remediation-20261012-213937`. Contains the starting tracked diff and 451 source/document/config files; excludes environment files, binaries, dependencies, and generated logs. Existing deletion of `mobile/src/utils/quotationTotals.js` and prior uncommitted remediation are preserved.

Fresh starting root verification: `2026-10-12T16:15:20.7478495Z`, 14 passed / 0 failed / 0 skipped steps. Original configured inventory: 413 passed / 0 failed / 0 skipped tests (backend 243, frontend unit 5, mobile unit 1, API 75, frontend E2E 36, mobile viewport 16, database-named 4, security 11, bug-hunt 22). Evidence: `reports/verification-baseline.json`, `reports/*.log`. This excludes legacy E2E, native UI/builds, dependency audits, and real MySQL migrations.

## gstack usage and limitations

Installed router, investigate, browse, CSO, health, and document-release instructions read. Investigation requires reproduction, a root cause, a failing regression, a minimal fix, and fresh verification. Following that cycle here. The initial WSL Bash probe failed (`WSL execvpe(/bin/bash) failed: No such file or directory`), but a later probe found working Git Bash at `C:/Program Files/Git/bin/bash.exe`; health and documentation startup helpers then returned `SKILL_START_PROTO: 1`. User selected existing health tools without changing AGENTS.md. This supersedes the initial blanket Bash-runtime limitation. The gstack browser executable itself remains blocked by Application Control; independent real Codex-browser and Playwright work is identified separately. Trusted CSO runner absent: formal CSO **not assessed**, not certified by independent checks. No commits, pushes, version bumps, PR changes, invented telemetry, or fabricated scores.

## Issue register

| Issue | Status | Current evidence / next action |
| --- | --- | --- |
| F02 supplier ledger | FIXED_AND_VERIFIED | Real H2 ledger/receipt/payment/reversal/concurrency regressions; affected purchasing suite 28/28. `reports/purchasing-final.log`. MySQL execution tracked separately. |
| F17 receiving bypass | FIXED_AND_VERIFIED | Generic RECEIVED/PARTIALLY_RECEIVED create/update rejected; dedicated receipt and replay assertions retained. Same purchasing evidence. |
| F01 PO detail | FIXED_AND_VERIFIED | Read-only detail no longer takes an untransactional write lock. Existing and missing detail regressions pass. |
| F03 Expo picker | FIXED_AND_VERIFIED | Real Expo customer/quotation/repeated picker/cancel/conversion/payment flow passed; web confirmation corrected. This is not physical-native-device coverage. `reports/expo-final.log`. |
| F04 CI secret | FIXED_NOT_VERIFIED | Required QA JWT/password validation, bounded readiness, seed/cleanup added. Source contracts pass; remote CI not run. |
| F05 Nginx | FIXED_NOT_VERIFIED | `^~ /api/` and shared response-header snippet fixed. Source contracts 3/3; live Nginx blocked by unavailable Docker engine. |
| F09 cleanup | PARTIALLY_FIXED | Non-2xx/unreachable cleanup now fails; 2/2 regressions. Seven legacy flows track owned IDs. Expo tracks its own IDs. QA-only converted-quotation cleanup added without relaxing production guard. Main automation still lacks a complete per-run ownership journal. |
| F14 legacy E2E | FIXED_AND_VERIFIED | Same seven scenarios retained, stronger persisted-data/PDF assertions and owned cleanup. 7/7 pass in `reports/legacy-verified.log`; final full rerun pending after accessibility edits. |
| F18 shared images | FIXED_AND_VERIFIED | After-commit cleanup checks surviving references; real H2/file rollback/sibling/mixed-import tests 3/3 plus product unit 19/19. `reports/shared-images-after.log`. |
| F19 MySQL/Flyway | BLOCKED | Real fresh/V9-to-V10 migration and Hibernate validation tests plus Linux CI job added. Local Failsafe: 1 startup error, 0 skips, `Could not find a valid Docker environment`. Docker Desktop start/info probes did not produce a Linux engine. |
| F06 distributors | FIXED_AND_VERIFIED | DTO and controller validation before persistence. Combined validation/file/sort suite 24/24. `reports/validation-after.log`. |
| F07 missing download | FIXED_AND_VERIFIED | Missing bytes produce sanitized ResourceNotFound/404; traversal rejected; valid bytes preserved. Same validation evidence. |
| F08 invalid sort | FIXED_AND_VERIFIED | Resource-specific scalar mapped-column validation for eight resources; invalid sort is 400 rather than server error. Same validation evidence. |
| F10 smoke password | FIXED_AND_VERIFIED | Required environment credential checked before network/browser. Regression 1/1; no password default in smoke source. |
| F11 accessibility | PARTIALLY_FIXED | Report tablist/tab/panel, keyboard navigation and date labels: 2/2 browser tests. Nested link/button removal across nine routes: 1/1 browser test. Remaining all-role/all-control accessibility coverage not claimed. |
| F12 metric units | FIXED_AND_VERIFIED | Explicit monetary metrics; counts/unknown numeric metrics no longer get currency. All frontend unit tests 8/8. |
| F13 mobile pagination | FIXED_AND_VERIFIED | User-approved list/picker split: page metadata, deduplication and stale-response guards. Mobile unit 5/5; real Expo reached a customer after three additional pages and a product after one, then completed quotation/conversion/payment and owned cleanup. `reports/expo-all-pagination-final.log`, no captured page errors. |
| F15 export | FIXED_AND_VERIFIED | Compatible React Native patch 0.83.6 to 0.83.10. Fresh export succeeded: 2698 modules, 4.4MB Hermes bundle. `reports/android-export-current.log`. Historical spawn error is not a confirmed current policy block. |
| F16 native builds | BLOCKED | Non-OneDrive staging passes. Earlier native C++ compilation failed with LLVM out-of-memory and Windows paging-file error 0x5AF; fresh-copy root builds hit Gradle ZIP network timeouts. Serial retry was cancelled after free physical memory fell to approximately 270 MB and Metro stalled. Fresh root will use one worker, a 1GB Java heap and in-process Kotlin; no Windows paging/security settings changed. Release and physical device results pending. |
| F20 dependencies | PARTIALLY_FIXED | Compatible RN patch only, image-size update attempted without force. Mobile install reports 32 advisories (21 high/11 moderate), frontend still 11. Fresh final audits and migration plan pending. No unapproved majors. |

## Regression setup

Added `backend/src/test/java/com/sanitaryware/crm/service/PurchasingIntegrityIntegrationTest.java`: real H2 repositories, real financial services/mappers/audit and independent service transactions. Only the unused PDF renderer is mocked; no mock API. Thirteen scenarios cover advances, receiving order, full/partial payments, reversals, multiple POs, overpayment replay, concurrent payment/receipt, RECEIVED create/update, duplicate receive, rollback, detail, and paid-draft deletion.

Initial harness errors (missing persisted paying user and omitted update date) are fixture defects, **not evidence of financial defects**. Corrected those fixtures without changing assertions, and rerunning against unchanged application code. F01's actual `Query requires transaction be in progress` was independently observed.

## Readiness and safeguards

Not production-ready. Baseline green is scoped, not exhaustive. Authorization, accounting semantics, inventory side effects, file references, MySQL migration evidence, native builds, and unresolved advisories must be verified. QA-only synthetic fixtures; credentials remain environment-only and are omitted here.

Final counts, exact repair-file inventory, security/database consequences, browser evidence, remaining blockers, and diff validation will be recorded as execution completes. No final success claim yet. The expanded root verifier now includes legacy E2E, remediation regressions, real Expo UI, Android export/debug/release, real MySQL, all three audits, and diff checking. It retains failed stages and reports runner counts separately from non-test checks; do not compare the expanded step count with the old 14-step baseline as if coverage were unchanged.

## Current security and environment notes

- Production quotation deletion still rejects converted records. The new `/api/qa/quotations/{id}?customerName=...` cleanup exists only in `qa`, requires ADMIN, exact named fixture/customer and creator ownership, and no linked order. It is not a general production delete API. Five unit tests include actual Spring profile registration; live role-denial tests are added for the final security run.
- Shared-image removal waits for database commit and retained-reference checks. An after-commit storage failure can leave bytes requiring retry; no durable file-deletion outbox was introduced. That limitation remains visible.
- User explicitly chose authenticated catalogue images. Public download exception removed; service also checks current user. All four roles can read bytes; anonymous users get 401. Web list/edit/detail use authenticated Axios blobs with origin/path checks, cancellation and URL revocation. Private document authorization is retained. Responses use `Cache-Control: private, no-store`. Six live security-policy checks pass (`reports/security-new-policies.log`), including exact image bytes for every role and unauthorized cleanup denial.
- Manual warehouse Dashboard inspection exposed company-wide financial summaries. User explicitly chose management-only financial dashboard data. Backend omits six financial fields for SALES/WAREHOUSE and never queries company financial aggregates for those roles; web/Expo hide those widgets. Two red backend role regressions were fixed without changing assertions. Management financial data is preserved. Backend package: 275 passed, 0 failed, 0 skipped (`reports/backend-final-policy-package.log`).
- No applied Flyway migration was edited. MySQL tests use an isolated container, not a production schema. H2 business tests do not substitute for MySQL migration or locking evidence.
- Actual manual Codex-browser observation saw customer list metadata grow from 50 to 100 records after Load more. FlatList virtualizes offscreen rows: the UI smoke now scrolls to find the owned row, rather than treating an absent DOM row as proof pagination failed.
- Initial Expo connection refusal and later Metro readiness timeouts are captured separately from the genuine absent-Load-more regression. The first staging-script attempt exceeded the Windows command-line limit by listing nonexistent exclusion paths; the script now excludes only existing generated directories. This harness error is not an application defect.
- A disposable native copy is being used to avoid altering source files, registry settings, Defender, Application Control or OneDrive configuration. Its `.env` files and stale generated native outputs are excluded. Local disk space was checked (23.57GB free before staging). Source working tree remains intentionally uncommitted.

## Durable learnings and documentation coverage

Git Bash works here even when the default `bash` command routes to broken WSL. Native Gradle output under OneDrive can become ReadOnly cloud reparse directories. Expo web Alert.alert has no implementation for this installed dependency, so web confirmations need an explicit supported web path. Payment mapping before a PO lock can load stale managed state; obtain the lock before mapping. FlatList viewport tests must exercise actual scrolling, not just query offscreen DOM nodes.

Reference/how-to coverage needed in TESTING.md: QA fixture cleanup contract, legacy command, actual Expo pagination test, non-OneDrive native staging and MySQL profile. CI workflows are configured, not remotely verified. No release VERSION/CHANGELOG/PR changes are appropriate for this uncommitted remediation run.

## Policy follow-up and verification provenance

The first expanded root run was superseded after the two explicit security decisions. It is not final verification. Its frontend result was 37 passed / 1 failed: the PO submit action had mistakenly been classified as a navigation link while repairing nested controls. Restored the correct accessible button selector; application submit behavior/assertions are unchanged. A fresh complete root run is underway. The summary now records `completed: false` during execution and refreshes after each step, so a prior baseline cannot be mistaken for a current completed run.

Windows Spring Boot repackage initially failed because the running server held Maven's target JAR open. The current immutable QA server uses a copied ignored runtime artifact under `reports/`, leaving `target/` free to rebuild. QA credentials/JWT are environment-injected. H2 resets were confined to disposable QA. Source and Windows security policies were not bypassed.

## Dependency plan: fresh audit on 13 October

Frontend: 11 advisories (6 high, 5 moderate, 0 critical). Mobile: 32 (21 high, 11 moderate, 0 critical), reduced from 33 after the compatible RN patch. These are dependency-node counts, not distinct proven application exploits. Evidence: `reports/frontend-audit-final.json`, `reports/mobile-audit-final.json`. No force, blanket overrides, major migrations or advisory suppression.

| Family | Plan / migration risk / required verification |
| --- | --- |
| RN / Expo | RN 0.83.10 installed; SDK 55 retained and Android export passes. Reject npm's incompatible Expo 44 downgrade suggestion. Approval needed for a future supported Expo/RN train migration; align Metro, regenerate native projects and run unit/UI/export/debug/release/hardware checks. |
| image-size | No longer in final advisory list after compatible closure update. Keep image/PDF regressions and confirm final lockfile paths. |
| Tailwind / braces | Audit proposes Tailwind 4.3.3 major; braces has no patched release listed. Requires approved CSS/config migration and full visual/browser regression. Parent upgrades do not guarantee every transitive path is repaired. |
| Vite / esbuild / launch-editor | Audit proposes Vite 8.3.4 major. Plan Node/plugin compatibility, build/proxy/file-path tests. Keep development servers local; this is mitigation, not a fix. |
| React Router | Proposed react-router-dom 7.18.4 is major. Review route resolution, Link/navigation security and full role/E2E behavior before an approved migration. |
| Metro | Upgrade with the supported Expo/RN train, not an unsupported standalone override. Verify bundling, exports, native builds and devices. |
| node-forge | Advisory lists no patched version. Trace CLI/signing reachability and accept only trusted signing inputs pending supported upstream resolution. Do not claim an arbitrary override fixes it. |
| sprintf-js | No patched release listed. Trace CLI/format-string reachability and use supported upstream changes plus tooling/native checks. |
| uuid | Affected below 11.1.1; older Expo/xcode closure remains. Upgrade owning supported packages and review CommonJS/ESM plus buffer-based v3/v5/v6 callers; no blind major override. |

Primary references: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Reachability is not established by npm severity alone. Unresolved advisories keep production readiness blocked pending upstream fixes or approved migrations.

## Completed expanded verification and driver follow-up

The expanded root run completed at `2026-10-13T12:47:22.0102384Z`: **19 passed / 7 failed / 0 skipped steps**, **479 passed / 1 failed / 0 skipped runner-reported tests**. It is not green. Passed test inventories: backend 275, frontend unit 12, legacy E2E 7, mobile unit 5, remediation 6, API 75, frontend E2E 40, mobile viewport 16 (Pixel 8, iPhone 8), database-named 4, security 17, bug-hunt 22. The one runner failure is MySQL container startup, not an entered migration assertion. Export, health, seed, cleanup and diff checking also passed.

Failed steps: Expo smoke (driver parsed empty logout JSON), debug/release (Gradle download timeout), MySQL (no Docker engine), three audit invocations (npm `EALLOWSCRIPTS`). Independent native attempt also reached compilation and exhausted memory/page-file capacity. Logs: `reports/expanded-verification-final.log`, `reports/expo-real-ui.log`, `reports/android-debug-staged.log` and the stage logs referenced in the summary. Historical summary retained as `reports/verification-expanded-previous.json`; a fresh root run is now in progress, not completed or green.

Driver repairs are small logical changes, not test suppression. The Expo listener now parses only successful owned-resource creations, immediately records malformed/missing-ID responses as failures, drains pending responses and cleans owned fixtures in `finally`. It journals created/cleaned IDs under `reports/expo-fixtures/` and keeps screenshots in ignored reports. Four regression cases pass. A live rerun encountered a stalled Metro server; all 109 owned fixtures were cleaned despite connection failures. The verified QA server alone was restarted with two workers. Fresh `reports/expo-driver-final.log` then passed 9 workflow, 10 module and 4 role checks, cleaned all 112 owned records and captured no page errors. Screenshot evidence: `reports/expo-role-{admin,manager,sales,warehouse}.png` and `reports/expo-phase1.png`. This is real automated browser evidence, not a physical-device or exhaustive manual pass.

The installed npm resolver reproduces rejection of inherited `npm_config_allow_scripts` in nested project-scoped audit. The read-only wrapper removes that child-environment flag, forbids scripts and retains user/project configuration and actual audit failures. Two regressions pass. Fresh wrapper audits: frontend **11 (6 high, 5 moderate)**, mobile **32 (21 high, 11 moderate)**, automation **0**, no critical advisories. Evidence: `reports/*-audit-current.json`. Audit configuration errors are repaired; unresolved high advisories are not.

In-app browser attachment recovered; clicking Sign In with empty fields visibly focuses Username and shows required-field validation. This is a narrow manual check, not an exhaustive authenticated audit. gstack browser's Application Control limitation and incomplete manual/hardware coverage remain separate from passing Playwright browser projects. No commit or push performed.

## Additional real defect found during fresh verification

The next root run found legacy Customer CRUD 6 passed / 1 failed. The entered search term remained correct while a late initial directory response replaced filtered rows. Trace contains real HTTP 200 directory/search responses overlapping after the successful customer PUT; no validation or backend save failure. A controlled browser regression delays delivery of unchanged real backend directory responses, searches for its unique owned customer, releases those responses, and requires the searched row to remain visible. First harness attempt checked the delayed-response list too early; corrected synchronization and drained route deliveries. The confirmed regression then failed at the final row assertion against unchanged application code (`reports/customer-search-race-red-confirmed.log`).

`CustomerListPage.jsx` now guards data, error and loading updates with the latest request generation, invalidating it on unmount. The same assertion passes (`reports/customer-search-race-green.log`). No mock API, test removal, altered product behavior or longer assertion timeout was introduced. Existing seven legacy workflows are rerunning. The prior in-progress root was superseded because it captured the pre-fix failure; its partial summary remains in `reports/verification-search-race-superseded.json`, and the fresh current root is running in `reports/expanded-verification-search-final.log`. Partial/superseded runs are not final success evidence.

The in-host gstack documentation review found eight factual setup/report gaps; the user approved all corrections. README now uses environment-injected mail/Twilio examples. TESTING clarifies process-level QA variables versus automation aliases, JWT minimum length, directory navigation and standalone Expo settings. Focused Expo/native status and historical-summary paths are corrected. Outside Claude Code coverage is unavailable (CLI not installed); the in-host review does not provide outside certification. Release version/CHANGELOG/PR/AGENTS were not changed.

## Latest continuation: 14 October 2026

The refreshed root run started at `2026-10-13T18:10:05Z` and was deliberately stopped during Android release C++ compilation when ten Clang processes had reduced free physical memory to 276 MB and free virtual memory to 877 MB. The verifier summary at `reports/verification-summary.json` is intentionally `completed: false`; it records **19 passed / 1 failed / 0 skipped steps**, **488 passed / 0 failed / 0 skipped runner-reported tests** through the debug-build step. Do not call this a fully green verification.

Completed current-run suites: backend 275/275; frontend unit 12/12; legacy browser E2E 7/7; mobile unit 5/5; remediation regressions 12/12; API 75/75; Chromium frontend E2E 43/43; Pixel 5 plus iPhone 13 viewport projects 16/16 (8 each); database-named browser tests 4/4; security 17/17; bug-hunt 22/22. Expo real UI smoke and Android bundle export passed; the Hermes bundle is 4.4 MB. Android source staging passed. `git diff --check` passed after the interruption.

The verification uncovered and fixed a real payment-form race. If the form issued two requests for the same order and the older response arrived after the user entered a partial amount, it reset the amount to the full balance. A controlled browser regression reproduced `50` changing to `500`; the form now preserves user-edited amounts while order responses settle. The regression passes in isolation and in the 43-test frontend suite. Customer list and edit response-race regressions also pass.

Android debug did not finish: Gradle could not fetch `com.squareup:javapoet:1.13.0` because `repo.maven.apache.org` temporarily failed DNS resolution. A subsequent read-only request returned HTTP 200, but debug was not rerun. Android release was interrupted before completion because Ninja spawned ten parallel Clang processes despite Gradle `--max-workers=1`; system memory was approaching exhaustion. No paging, security, or OS settings were changed. The release APK remains unverified.

The live MySQL/Flyway integration test errored before assertions: **1 test, 1 error, 0 skips** because Testcontainers could not find a Docker environment. The Docker engine pipe is unavailable. Frontend audit remains **11 advisories (6 high, 5 moderate)**; mobile **32 (21 high, 11 moderate)**; automation **0**. No `npm audit --force` or major upgrade was used. Exact audit JSON is in `reports/frontend-audit-current.json`, `reports/mobile-audit-current.json`, and `reports/automation-audit-current.json`.


## Follow-up diagnostics — 2026-10-14 06:41 UTC

No test suites were rerun. The verifier was inspected and not invoked because the current process lacks required QA password variables; it would stop at preflight without overwriting the report. If credentials are supplied, it writes a replacement summary and proceeds to Android debug and release, so a later run must first preserve the existing evidence and check resources. Current free physical RAM is approximately 1.2 GB, below a safe margin for the configured 1 GB Gradle heap plus native compiler overhead. Maven Central TCP/443 is reachable now, but Android debug remains unverified. Docker's Linux engine pipe remains unavailable. The GitHub Actions `mysql-migration-verification` job is configured on Ubuntu and runs `cd backend && mvn verify -Pmysql-integration`; no CI run was initiated. Source and test inspection confirm catalogue image downloads require authentication, correcting stale public-image wording in earlier report sections. The manual browser-control request timed out, so prior focused ADMIN checks remain the latest manual evidence.
