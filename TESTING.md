# Testing Sanitaryware CRM

> **Latest preflight, 14 October 2026 07:36 UTC:** services responded, but full verification is still incomplete. QA credential variables were absent, free memory was 808 MiB, Docker/Testcontainers was unavailable, and frontend/mobile audits reported 11 (6 high) and 32 (21 high) advisories. Passing unit/build/lint evidence is from 07:26 UTC; Playwright/bug-hunt evidence is from 06:36 UTC. See the timestamped reports for exact blockers; this is not release sign-off.

> Current gate status (14 October 2026, 07:26 UTC): fresh backend 282/282, frontend 12/12 plus build, and mobile 5/5 plus lint passed. Latest Playwright 156/156 and bug-hunt 22/22 are from 06:36 UTC, not this rerun. Frontend/mobile audits still have 11 (6 high) and 32 (21 high) advisories. Docker/Testcontainers is unavailable; Android native builds and the full root verifier were withheld because QA environment variables are absent and host memory is below the configured Gradle heap. This is not production sign-off. See the dated continuation in `reports/verification-summary.json`.

## Prerequisites

- Java 17
- Maven 3.9.6 (the repository wrapper is under `backend/apache-maven-3.9.6`)
- Node.js 20.19 or newer and npm
- Chromium and WebKit browsers installed with Playwright
- A running backend on `http://localhost:8081` and frontend on `http://localhost:5173` for browser/API automation

## QA credentials

QA users are created only in the `dev` and `qa` Spring profiles. Passwords are required environment variables; they are not stored in application properties or source control:

```powershell
$env:QA_ADMIN_PASSWORD = 'use-a-local-secret'
$env:QA_MANAGER_PASSWORD = 'use-a-local-secret'
$env:QA_SALES_PASSWORD = 'use-a-local-secret'
$env:QA_WAREHOUSE_PASSWORD = 'use-a-local-secret'
$env:JWT_SECRET = '<set-a-local-secret-of-at-least-32-characters>'
```

The automation suite requires matching `QA_*_PASSWORD` values (or `TEST_*_PASSWORD` aliases) from the process environment or an ignored `automation-tests/.env` file. Never commit that file.

## Start locally

```powershell
cd backend
apache-maven-3.9.6/bin/mvn.cmd spring-boot:run -Dspring-boot.run.profiles=qa

cd ../frontend
npm run dev
```

The QA profile uses disposable H2. Production requires MySQL and the environment variables documented in `backend/.env.example`.

## Verification commands

From the repository root, set the required variables and run the complete verification workflow:

```powershell
npm run verify
```

This runs backend tests, frontend tests/build and all seven legacy workflows, mobile tests/lint, API/frontend/database/security/mobile Playwright projects, bug-hunt tests, seed, health, scoped cleanup, remediation regressions, actual Expo UI, Android export/debug/release, isolated MySQL migration verification, all npm audits, and diff checking. It writes `reports/verification-summary.json` with step results and runner-reported test counts; build/environment/audit checks are not invented test cases. Failures do not hide later checks. `cd automation-tests; npm test` chains release projects and bug-hunt tests; if the release/mobile command fails, run `npm run test:bughunt` separately to obtain its result. `test:all` is the release-only command.

Before root verification, start the real Expo web app in another terminal: `cd mobile; npm run web -- --host localhost --max-workers 2`, with `EXPO_PUBLIC_API_BASE_URL=http://localhost:8081/api`. The root workflow uses `UI_URL=http://localhost:8082` and `API_URL=http://localhost:8081/api` unless explicitly configured. Credentials come from the same required QA environment as the backend; no password fallback is provided. Native UI smoke covers pagination past 50 customers/products, retained picker drafts/cancellation, quote creation, conversion, payment and all ten module screens. This tests Expo web, not a physical Android/iOS device.

Legacy workflows: `cd frontend; npm run test:legacy`. Their fixture IDs and cleanup statuses are written under ignored `reports/legacy-fixtures/`. Converted quotations remain undeletable in production. In QA only, the admin-only `/api/qa/quotations/{id}?customerName=...` endpoint permits cleanup of the suite's exact named customer/creator-owned fixture after its linked order has been removed. Ordinary customer/product cleanup is soft deactivation. This does not constitute a complete ownership journal for the older main automation suite.

Real MySQL verification requires a running Docker Linux engine: `cd backend; apache-maven-3.9.6/bin/mvn.cmd verify -Pmysql-integration`. It uses a disposable MySQL 8.4 container to test all migrations on a fresh schema, V9-to-current upgrade with retained data, uniqueness and Hibernate schema validation. H2 unit/integration tests and database-named API tests are not substitutes. The Linux CI job executes this profile; its configuration alone is not proof of a remote pass.

On Windows, native staging runs `powershell -NoProfile -File scripts/stage-android.ps1` from the root. It copies current mobile source/dependencies to a disposable temporary directory outside OneDrive, excluding `.env` and stale generated native outputs. Read `reports/android-staging.json`, set `CRM_ANDROID_BUILD_ROOT` to its `buildRoot`, then run mobile debug/release commands normally. Root verification does this staging automatically. The copied directory is retained as evidence; no registry, Application Control, Defender or OneDrive settings are changed. It can use several GB of temporary disk/cache space. Do not clean source directories to repair generated-output access errors.

Individual commands:

```powershell
cd backend; apache-maven-3.9.6/bin/mvn.cmd test
cd frontend; npm test; npm run build
cd mobile; npm test; npm run lint
cd automation-tests; npm run health; npm run seed; npm test; npm run cleanup
```

Run all browser projects explicitly with `cd automation-tests; npx playwright test --project=chromium --project="Mobile Chrome (Pixel 5)" --project="Mobile Safari (iPhone 13)"`.

## Approved security policy (13 October)

Catalogue images now require login, including imported PDF images. ADMIN, MANAGER, SALES and WAREHOUSE can download them; anonymous requests must return 401. The web app fetches images through the authenticated API adapter and displays revoked-on-unmount blob URLs, not tokens embedded in image URLs. External origins must not receive CRM credentials. Private attachment ownership/role checks remain in force; download responses are private/no-store.

Company-wide dashboard revenue, receivables, payables, supplier payment totals, monthly revenue and top-product revenue are restricted to ADMIN/MANAGER. SALES/WAREHOUSE responses omit these fields and their web/Expo widgets are hidden. Operational order/inventory widgets remain available. Verify both role responses and rendered UI; hiding a widget alone is not authorization.

Use a copied ignored runtime JAR for QA verification on Windows rather than serving Maven's target JAR while rebuilding it. Otherwise Spring Boot repackage can fail because the target is open. Keep the same environment credentials; do not print them. Root summary includes `completed: false` until all stages finish, and separates runner counts from build/environment/audit checks.

## Verification driver details

For standalone real Expo smoke, start the web server first, then run from `mobile/` with `UI_URL=http://localhost:8082`, `API_URL=http://localhost:8081/api`, and `RUN_LEGACY_SMOKE=1` in the process environment: `npm run ui:smoke`. Set all four `QA_*_PASSWORD` values, or a common local `QA_PASSWORD`. Root verification sets the URLs/module flag automatically. Without explicit settings, the standalone script defaults to port 19006 and does not run module navigation.

Expo smoke journals only successfully created, owned record IDs under ignored `reports/expo-fixtures/`; cleanup statuses are appended to the same journal. Logout's empty response is not a creation response and is not parsed as JSON. Invalid creation responses still fail the check. Screenshots are saved under `reports/expo-*.png`. Inspect the journal after a process crash before recovering fixtures; never delete unrelated records by name alone.

Root audits use `node scripts/audit.mjs <frontend|mobile|automation-tests>`. npm 11 can export user `allow-scripts` configuration into a lifecycle environment and then reject it in a nested audit with `EALLOWSCRIPTS`. The wrapper removes only that inherited flag for the read-only child, sets `--ignore-scripts`, preserves project/user npm configuration and returns the actual audit exit code. It does not install dependencies, force upgrades or suppress advisories.

## Troubleshooting

- If health checks fail, confirm ports 8081 and 5173 and inspect backend logs.
- If QA login fails, confirm all four QA password variables are set consistently before starting the backend and seeding.
- Historical WebKit `spawn UNKNOWN` had Code Integrity events 3033/3077 and Win32 error 4551. The 13 October expanded run now passes all eight iPhone tests; do not describe the historical error as a current failure. If it recurs, run `npx playwright install webkit`, inspect browser-cache access and the minimal launch probe, and retain the exact evidence. Do not disable security controls or hide the iPhone project; use Linux CI or an administrator-approved policy exception.
- Remove test data only with `npm run cleanup` against the disposable QA database. Cleanup deletes only IDs explicitly supplied through `QA_CLEANUP_CUSTOMER_IDS`/`QA_CLEANUP_CATEGORY_IDS` and catalogue batches explicitly supplied through `QA_CATALOGUE_IMPORT_BATCH_IDS`. There is no batchless catalogue cleanup route.
- Catalogue cleanup uses `DELETE /api/qa/catalogue-imports/{batchId}`, available only in `dev`/`qa` and only to ADMIN. Cleanup deactivates products newly created by that exact batch, removes only image links owned by it (including links attached to pre-existing products), and preserves image bytes while another product references them. Failed image deletion remains queued for retry and appears in `pendingImageCleanup`; cleanup fails rather than silently claiming success when tasks remain. Imported category rows remain for referential safety.
- Import response `createdCount`/`updatedCount` reflect persisted product rows. `imageLinkFailures` reports image storage/link failures separately; an image problem does not turn a successfully saved product into a skipped row.
- Linux CI requires `QA_JWT_SECRET` (at least 32 characters), `QA_ADMIN_PASSWORD`, `QA_MANAGER_PASSWORD`, `QA_SALES_PASSWORD`, and `QA_WAREHOUSE_PASSWORD` repository secrets. It installs Chromium and WebKit and runs both viewport projects, legacy workflows and real Expo web smoke. Never paste the secret values into logs or workflow files.

### Latest local verification note (2026-10-14)

Latest independent rerun: backend 282/282, frontend unit 12/12 plus build, mobile unit 5/5 plus lint, Playwright 156/156 (Chromium, Pixel 5, iPhone 13/WebKit), and bug-hunt 22/22. Frontend/mobile dependency audits still report 11 (6 high, 5 moderate) and 32 (21 high, 11 moderate) advisories respectively; automation audit reports zero. The historical root verification remains incomplete (19 passed, 1 failed, 0 skipped) and was not rerun. MySQL/Testcontainers requires a functioning Docker engine; Android native debug/release were not rerun in this resource-constrained check. See `reports/verification-summary.json`; this note is not a release sign-off.

Follow-up diagnostics at 2026-10-14 06:41 UTC confirmed that root `scripts/verify.ps1` checks the four required `QA_*_PASSWORD` variables before writing its summary; if credentials are supplied, it replaces the top-level summary and proceeds to native Android builds. Preserve the existing report and check resources before such a run. This PowerShell process did not have those variables. Current local Docker/Testcontainers cannot connect to the Linux engine. The configured Ubuntu CI job is `mysql-migration-verification` and runs `cd backend && mvn verify -Pmysql-integration`; configuration is not evidence that it has passed. Catalogue image downloads require authentication, as the code and security tests enforce.

Latest gate check (14 October 2026, 06:52 UTC): free memory about 1,007 MiB; Maven Central DNS/TCP 443 reachable; required QA variables absent from this process; Docker Desktop Linux engine unavailable. Do not run native Android builds at this memory level. The CI job has no manual-dispatch trigger and current branch HEAD has no associated PR workflow run. Older per-run counts 275 backend and 33 mobile advisories are historical; current test evidence is backend 282 and current audits are mobile 32 (21 high).

## Latest verification evidence

The historical 12 October verification used only 14 root steps; see `reports/verification-baseline.json`. Do not treat it as verification of the expanded inventory above. The latest expanded root run is incomplete: see `reports/verification-summary.json` and the supplemental [14 October continuation results](reports/verification-continuation-2026-10-14.json). Android debug did not complete after a temporary Maven Central DNS error; release compilation was stopped at a low-memory threshold. The MySQL Testcontainers run needs a working Docker engine. Current suite counts, audit findings and exact evidence are in [CRM_DEVELOPMENT_PROGRESS_AND_VERIFICATION.md](CRM_DEVELOPMENT_PROGRESS_AND_VERIFICATION.md). Compatible React Native 0.83.10 export has passed; that is not proof of a native debug/release APK or hardware pass. CI is configured but not remotely executed by this local task.

`npm run seed`, `npm test`, `npm run test:bughunt`, the explicit Playwright command, `npm run cleanup`, and root `npm run verify` fail fast when credentials are missing. Set all four `QA_*_PASSWORD` process variables before backend QA startup and root verification; those workflows do not accept `TEST_*_PASSWORD` aliases. Only the automation suite supports the documented aliases. No default QA password is used. Never paste or commit the values.

## Manual QA evidence

The latest authenticated Chromium route/responsive pass is recorded in [docs/manual-complete-functional-qa-2026-10-12.md](docs/manual-complete-functional-qa-2026-10-12.md). It covered all protected routes, desktop widths 1366x768 and 1920x1080, and Pixel 5/iPhone 13-sized viewports. Full mutation coverage for all four roles remains dependent on separate role sessions; PDF import cleanup is now supported for newly created imported products.

Focused ADMIN follow-up on 14 October: all six report tabs rendered after loading; Audit Logs loaded, actor filtering for `qamanager` returned 12 events, and Reset restored the unfiltered first page (20 of 535). An existing order detail and payment form were inspected; no receipt was submitted and no records were created or modified. This pass did not capture console/network logs or cover other roles. Backend `/api/health`, frontend `:5173`, and Expo web `:8082` responded successfully. Root verification remains incomplete (19 passed, 1 failed, 0 skipped steps; 488 runner-reported tests passed before the Android debug failure). Do not use the focused browser pass as exhaustive manual sign-off.
