# Sanitaryware CRM — Full Stack Bug Hunt Report

- **Audit date:** 2026-07-18
- **Branch:** `main`
- **Latest commit:** `b2156e5 chore: ignore native mobile android directory`
- **Initial worktree:** Not clean; pre-existing untracked `automation-tests/api/bug-hunt/` and `automation-tests/frontend/bug-hunt/` were reported before testing and preserved.
**Rule observed:** No application bug was fixed and no test/report artifact was committed.

## 1. Executive Summary

- **Total reproducible application bugs:** 10
- **Critical:** 0
- **High:** 2
- **Medium:** 6
- **Low:** 2
- **Security risks:** 5, including the two high-severity authorization bugs
- **Major test gaps:** 18 grouped gaps
- **Final QA verdict:** **Not release ready**

The baseline backend build is healthy and most existing Playwright coverage passes, but deeper negative testing found broken role enforcement on product deletion and system settings, incorrect 500/409 error handling with internal SQL/signature disclosure, missing customer validation, and frontend role leakage. Production readiness is also blocked by absent staging/production compose files, known production dependency vulnerabilities, predictable production configuration fallbacks, and the fact that the dev/QA database path uses H2 `create-drop` rather than validating the MySQL/Flyway production path.

### Testing scope summary

| Area | Files/Modules Found | Current Test Coverage | Missing Coverage | Risk |
|---|---|---|---|---|
| Backend | 110 Java sources; controllers, services, repositories, DTOs, security, PDF, Flyway V1 | 8 JUnit classes / 22 tests | Most controllers/services, full security matrix, real DB integration, validation boundaries | High |
| Frontend | React/Vite; 18 page areas, services, Zustand auth, route/layout components | Playwright happy paths; no frontend unit/component suite | 400/403/404/500 states, null data, role guards, most edit/detail paths | High |
| Mobile | Expo React Native app plus web-viewport Playwright specs | One utility test; 16 web mobile-viewport checks | Native component/navigation/API/offline/device tests | High |
| Automation | API, frontend, mobile, database, security | Full configured run: 92 tests | Filename matcher omits role-access and database specs; negative breadth incomplete | High |
| Docs/CI | QA case docs and GitHub workflows | Documentation present | Evidence that docs match executable discovery; release gate for omitted suites | Medium |
| Docker/production | Backend Dockerfile only | Docker CLI available | Requested compose files absent; no container smoke path | High |

## 2. Commands Run

| Command | Result | Notes |
|---|---|---|
| `git status --short --branch` | Completed | `main...origin/main`; two pre-existing untracked bug-hunt directories |
| `git branch --show-current` | Completed | `main` |
| `git log -1 --oneline` | Completed | `b2156e5` |
| `mvn clean test` | Passed | 22 passed, 0 failed/errors/skipped; `BUILD SUCCESS`, 19.017 s |
| `mvn clean package` | Passed | Exit 0; 22 passed; executable JAR created; 20.694 s |
| `npm install` (frontend) | Passed with warnings | Exit 0; 164 packages; 11 total audit findings reported by install |
| `npm run build` (frontend) | Passed | 1,567 modules; JS 421.84 kB / 107.29 kB gzip; 4.77 s |
| `mvn spring-boot:run "-Dspring-boot.run.profiles=dev"` | Started | H2 dev profile on port 8081 |
| `Invoke-RestMethod http://localhost:8081/api/health` | Passed | `database=UP`, `status=UP` |
| `npm run dev` | Started | Vite ready on port 5173 |
| `npm run health` | Passed | Backend healthy |
| `npm run seed` | Passed | Registered missing admin and created base fixtures |
| `npm test` | Failed | 92 total: 87 passed, 4 failed, 1 skipped; four deep-negative failures |
| `npx playwright test mobile/specs --reporter=line` | Passed | 16/16 across Pixel 5 and iPhone 13 projects; 1.3 m |
| `npx playwright test security/specs --reporter=line` | Passed but incomplete | 3/3; role-access spec was not discovered |
| `npx playwright test database/specs --project=chromium --reporter=line` | Failed discovery | `Error: No tests found` |
| Temporary wrapper for omitted role/database specs | Failed | 4 passed, 1 failed; failure was a stale test expectation against intentional soft-delete behavior |
| Temporary SALES visual spec | Passed | 1/1; captured desktop/mobile role leakage |
| Temporary extended negative API spec | Failed | 4/4; exposed null customer type and pagination behavior; isolated calls confirmed email/phone defects |
| `npm audit --omit=dev --json` (frontend) | Failed audit gate | 5 production findings: 2 high, 3 moderate |
| Local response samples | Completed | health 7.6 ms; products 7.8 ms; customers 7.0 ms; dashboard stats 27.7 ms; login 140.7 ms |
| `docker --version` | Passed | Docker 29.5.3 |
| `docker compose version` | Passed | Compose v5.1.4 |
| `docker compose -f docker-compose.staging.yml config` | Failed | Compose file absent |
| `docker compose -f docker-compose.staging.yml up --build` | Failed safely | Same missing-file error; no containers started |
| Secret/config grep | Completed | Classified below |

## 3. Backend Test Results

| Suite | Total | Passed | Failed | Skipped | Notes |
|---|---:|---:|---:|---:|---|
| Maven JUnit (`clean test`) | 22 | 22 | 0 | 0 | Eight classes only |
| Maven package lifecycle | 22 | 22 | 0 | 0 | JAR packaged successfully |
| Configured Playwright API tests including bug-hunt | 52 API tests before frontend segment | 48 | 4 | 0 | Four reproduced backend defects |
| Omitted DB/security wrapper | 5 | 4 | 1 | 0 | One test defect: expected hard-delete FK rejection although service intentionally soft-deactivates customers |
| Extended negative API spec | 4 | 0 | 4 | 0 | See Bugs BUG-005 to BUG-010 and notes |

### Backend module coverage

| Backend Module | Existing Tests | Missing Tests | Risk | Priority |
|---|---|---|---|---|
| Auth/JWT | Auth controller mocks; API login/missing/expired/invalid token | Tampered/expired token unit boundaries, registration duplicates, password changes, manager matrix | High | P0 |
| Products | 1 controller test; API create/search/duplicate SKU/negative price | Every role and mutation, null body, stock patch, pagination limits, bulk upload | Critical | P0 |
| Settings | None | Read/update authorization, DTO validation, audit logging | Critical | P0 |
| Purchase Orders | API happy path and receive overflow | Invalid distributor/product, empty items, update/delete/status transitions, payment consistency | High | P0 |
| Customers | 2 controller tests; API create/list/missing phone | Email format, phone uniqueness, defaults, duplicates, active filtering | High | P1 |
| Quotations | 5 controller tests; API create/status/empty/negative | Past dates, invalid products, all transitions, concurrent/double conversion | High | P1 |
| Orders | 3 service tests; API conversion/double conversion | Direct create/update, stock races, invalid IDs, status transitions | High | P1 |
| Payments | 3 service tests; API full/over/nonexistent | Partial/full lifecycle, concurrency, delete authorization, invalid dates | High | P1 |
| Categories/Brands | Category controller and API CRUD subset | Duplicate names, FK delete behavior, manager/sales matrix | Medium | P1 |
| Distributors/Distributor Payments | API distributor subset | Payment service rules, overpayment, update/delete, duplicate contact fields | High | P1 |
| Dashboard | API happy path | Empty/null data, query counts, response time, failure handling | Medium | P1 |
| PDF/File upload | API PDF happy/404 | Large documents, unsafe files/names, authorization, load/concurrency | High | P1 |
| Database/Flyway | Health-only specs not discovered normally | Real MySQL migration from empty and prior versions; FK/unique/cascade assertions | Critical | P0 |

## 4. Frontend Test Results

| Suite | Total | Passed | Failed | Skipped | Notes |
|---|---:|---:|---:|---:|---|
| Vite production build | 1 | 1 | 0 | 0 | Bundle generated |
| Configured frontend E2E including responsive bug-hunt | 21 | 21 | 0 | 0 | Happy-path oriented |
| SALES visual/route evidence | 1 | 1 | 0 | 0 | Assertion passes because forbidden UI is visibly present; evidence of BUG-008 |
| Required viewport overflow sweep | 15 route/viewport combinations | 15 | 0 | 0 | Dashboard/products/settings at five widths |
| Mobile viewport suite | 16 | 16 | 0 | 0 | Web UI viewports, not native app automation |

### Frontend screen coverage

| Frontend Screen | Existing Test | Missing Test | Possible Bug | Priority |
|---|---|---|---|---|
| Login | Success, wrong password, empty form | logout token removal, 401 refresh loop, valid-session refresh | No confirmed new bug | P1 |
| Register | None | validation, duplicate identity, role creation policy | Coverage gap | P1 |
| Dashboard | Auth redirect, metrics render | empty/500/null states, KPI correctness, SALES copy | BUG-009 | P1 |
| Categories | list/create | edit, duplicate, delete-in-use, roles, errors | Role coverage gap | P1 |
| Brands | API only | all browser behavior | Coverage gap | P1 |
| Products | list/create/navigation | edit/delete/filter/low-stock/invalid form/roles | BUG-008 plus backend BUG-001 | P0 |
| Customers | create/invalid browser email | search/edit/detail/duplicate fields/API nulls | Backend BUG-005/006/007 | P1 |
| Distributors | create | list/edit/delete/errors/roles | Coverage gap | P1 |
| Quotations | create/download/accept | reject/edit/multiple items/double convert/errors | Coverage gap | P1 |
| Orders | list/search/PDF | create/edit/status/partial payment/404/500 | Coverage gap | P1 |
| Payments | one record-and-balance path | overpayment UI, partial/full, API errors | Coverage gap | P1 |
| Purchase Orders | API only | all browser flows, invalid distributor, receive | BUG-004 reachable | P0 |
| Distributor Payments | None | all list/form/payment/error paths | Coverage gap | P0 |
| Profile | None | load/save/password/logout/401 | Coverage gap | P1 |
| Settings | Visual capture only | authorization, 403, validation, save errors | BUG-002 and BUG-008 | P0 |
| Not found/unauthorized | No route present | unknown URL and forbidden route behavior | Missing UX | P1 |

## 5. Security Test Results

| Suite | Total | Passed | Failed | Skipped | Notes |
|---|---:|---:|---:|---:|---|
| Configured standalone security run | 3 | 3 | 0 | 0 | Missing token, invalid token, basic CORS only |
| Omitted role-access spec via wrapper | 1 | 1 | 0 | 0 | Only checks category delete, not products/settings |
| Deep-negative role checks | 2 | 0 | 2 | 0 | SALES product delete and settings update succeeded |
| Modified JWT check | 1 | 1 | 0 | 0 | Returned 401 |
| Password response check | 1 | 1 | 0 | 0 | `/api/auth/me` did not return password |
| Frontend production dependency audit | 5 | 0 | 5 | 0 | 2 high, 3 moderate |

## 6. Bugs Found

| Bug ID | Severity | Area | Title | Steps | Expected | Actual | File/Endpoint | Suggested Fix |
|---|---|---|---|---|---|---|---|---|
| BUG-001 | High | Backend security | SALES can delete products | Login as `qasales`; create product as admin; `DELETE /api/products/{id}` with SALES token | 403 | 204 and product deactivated | `ProductController.java`; `DELETE /api/products/{id}` | Add method authorization to all product mutations and regression-test ADMIN/MANAGER/SALES matrix |
| BUG-002 | High | Backend security | SALES can update system settings | Login as SALES; GET settings; PUT same body | 403 | 200; settings update accepted | `SystemSettingsController.java`; `PUT /api/settings` | Restrict mutation to ADMIN (or documented roles), add audit log and role tests |
| BUG-003 | Medium | API errors | Client request errors become 500 with internals | POST product with null body; also request authenticated nonexistent `/api/dashboard` | 400 or 404, sanitized body | 500 with controller signature / `No static resource` text | `GlobalExceptionHandler.java` | Handle unreadable/missing body and `NoResourceFoundException` explicitly; never echo internals |
| BUG-004 | Medium | Purchase Orders | Invalid distributor falls through to DB and leaks SQL | Admin POST PO with nonexistent distributor ID and valid item | 404 distributor not found | 409 with H2 SQL/column detail | `PurchaseOrderMapper.java`, `PurchaseOrderServiceImpl.java`, `GlobalExceptionHandler.java` | Resolve IDs with `orElseThrow(ResourceNotFoundException)` before mapping; sanitize DB exceptions |
| BUG-005 | Medium | Customers | Omitted optional customer type causes DB failure | POST customer with name/phone but no `customerType` | 201 with RETAIL default, or 400 if required | 409 `NULL not allowed` plus SQL | `CustomerDTO.java`, `CustomerMapper.java`, `Customer.java` | Preserve entity default or make DTO field required with 400 validation |
| BUG-006 | Medium | Customers | Malformed email accepted | POST customer with `email=not-an-email-*` and valid type | 400 | 201 and invalid value persisted | `CustomerDTO.java`; `POST /api/customers` | Add `@Email`, normalize/trim, test API and UI |
| BUG-007 | Medium | Customers | Duplicate customer phone accepted | Create two customers with different emails and same phone | Second request 400/409 according to duplicate policy | Both requests 201 | `CustomerDTO.java`, `customers.phone_number` migration | Define uniqueness policy, normalize phone, enforce DB/service constraint |
| BUG-008 | Medium | Frontend authorization/UX | SALES sees and opens administration UI | Login as SALES; inspect sidebar; navigate directly to `/settings` | Admin-only links hidden and route denied | Settings, distributors, POs and supplier payments visible; editable settings form opens | `App.jsx`, `ProtectedRoute.jsx`, `DashboardLayout.jsx` | Add role metadata to routes/menu and an unauthorized page; keep backend enforcement authoritative |
| BUG-009 | Low | Frontend copy | SALES dashboard says “Hello, Administrator” | Login as SALES and wait for dashboard | Role-neutral or user-correct greeting | Administrator greeting shown | `DashboardPage.jsx` | Render user name/role-aware copy |
| BUG-010 | Low | API pagination | Invalid pagination silently normalizes | GET products with `page=-1`; GET with `size=1000000` | 400 with allowed range | 200; page becomes 0 and size becomes 2000 | Pageable controller endpoints/config | Add explicit max/default validation and document contract |

### Reproduction evidence

- `screenshots/qa-bug-hunt/01-sales-dashboard-admin-navigation.jpg`
- `screenshots/qa-bug-hunt/02-sales-settings-edit-form.jpg`
- `screenshots/qa-bug-hunt/03-sales-settings-mobile.jpg`
- Playwright failure contexts under `automation-tests/test-results/`
- Temporary uncommitted specs under `automation-tests/api/bug-hunt/`, `automation-tests/frontend/bug-hunt/`, and `automation-tests/security/bug-hunt/`

## 7. Test Coverage Gaps

| Area | Missing Test | Risk | Priority |
|---|---|---|---|
| Playwright discovery | `security/specs/role-access.spec.js` and all `database/specs/*.spec.js` are excluded by project filename matcher | False green suite | P0 |
| Backend security | Complete role matrix per method, especially products/settings | Privilege escalation | P0 |
| Real database | MySQL container integration and Flyway migration validation | Production-only failures | P0 |
| Error contract | Null body, malformed JSON, nonexistent route, sanitized SQL errors | 500s/information leak | P0 |
| Customers | Defaults, email, normalized unique phone/email | Corrupt CRM data | P1 |
| Purchase orders | Invalid distributor/product and empty items | Integrity failures | P0 |
| Frontend roles | Menu and direct-route assertions for SALES/MANAGER/ADMIN | Misleading/unsafe UI | P0 |
| Frontend unit tests | Components, stores, services, interceptors | Slow/flaky feedback | P1 |
| Register/Profile | Full UI/API validation and password flows | Account defects | P1 |
| 400/401/403/404/500 UI | Per screen | Crashes/confusing failures | P1 |
| Null/empty API data | Lists, optional fields, dashboard charts | Runtime crashes | P1 |
| Pagination/search | Empty query, negative page, max size, last page | Performance/contract issues | P1 |
| Native mobile | Expo screens, AsyncStorage, native navigation, offline behavior | Mobile regressions | P1 |
| PDF/upload | Large/invalid files, authorization, filename/path attacks | Availability/security | P1 |
| Concurrency | duplicate quotation conversion, payment/stock races | Financial/stock corruption | P0 |
| Performance | query count and load thresholds | Scale failures | P1 |
| Docker smoke | No runnable compose definition | Deployment untested | P0 |
| Test quality | DB constraint test accepts 500 as success and assumes hard delete despite soft delete | Misleading results | P1 |

## 8. UX Issues

| Screen | Issue | Severity | Suggested Fix |
|---|---|---|---|
| Global sidebar | SALES sees modules they cannot legitimately administer | Medium | Filter navigation by role and mirror route policy |
| Dashboard | SALES greeted as Administrator | Low | Use authenticated user's name or neutral copy |
| Settings | SALES sees editable configuration on desktop and mobile | High | Deny route and hide link; show explicit unauthorized page |
| Routing | No catch-all not-found or unauthorized route | Medium | Add accessible 404/403 screens |
| Header | “Live Database Connection” is static reassurance, not a verified state | Low | Bind to health state or use neutral wording |

### Captured flow health

1. **SALES dashboard — unhealthy authorization presentation.** Stable KPI screen loads, but admin-only navigation is visible and the greeting mislabels the role.
2. **SALES settings desktop — unhealthy.** Direct route opens a fully editable system-settings surface.
3. **SALES settings mobile — unhealthy.** The same editable surface reflows cleanly but remains exposed to the wrong role.

Visual evidence proves presentation and route behavior, not full WCAG compliance. Keyboard order, screen-reader names, focus recovery, contrast ratios, and zoom beyond the tested viewports remain unverified.

## 9. Security Risks

| Risk | Severity | Evidence | Fix |
|---|---|---|---|
| Broken product/settings authorization | High | BUG-001/002 live responses | Enforce method roles and add full matrix tests |
| Predictable JWT fallback in default config | High | `jwt.secret=${JWT_SECRET:local-only-change-me-...}` | Remove fallback; fail startup when secret absent outside dev/QA |
| Default root DB password fallback | High | `DATABASE_USERNAME:root`, `DATABASE_PASSWORD:1607` | Remove defaults from production config; use secret manager |
| Production dependency vulnerabilities | High | `npm audit --omit=dev`: axios/form-data high; router/follow-redirects moderate | Upgrade and rebuild; re-run audit and regression suites |
| SQL/framework detail leakage | Medium | BUG-003/004/005 responses | Central sanitized error schema; log details server-side only |

### Secret classification

| Finding | Classification |
|---|---|
| Dev/QA JWT strings | Dev-only placeholders |
| `application-dev.properties` H2 password `1607` | Dev-only config |
| Default `application.properties` JWT and DB fallbacks | Real production risk because the main profile starts without required secrets |
| `.env.example` files | Safe placeholders; no committed real `.env` found in inspected tracked files |
| Frontend bundle | No JWT secret/database password found by source/bundle scan |

## 10. Performance Risks

| Area | Evidence | Severity | Fix |
|---|---|---|---|
| Dashboard full-table scans | `findAll()` for products, distributor payments, orders, purchase orders plus per-status queries | Medium | Replace with aggregate/count/sum queries and query-count tests |
| Dashboard query fan-out | One query per order status plus recent-order mapping | Medium | Single grouped status query; fetch projection for recent rows |
| Unbounded client request intent | Huge page request accepted and clamped to 2000 | Medium | Set documented max (for example 100) and reject excess |
| Frontend bundle | Main JS 421.84 kB / 107.29 kB gzip | Low | Route-level lazy loading and bundle-budget CI |
| Dependency/browser metadata | Browserslist data six months old | Low | Refresh compatibility data in maintenance cycle |
| Local response samples | Healthy sampled endpoints 7–28 ms; login 141 ms | Informational | Establish repeatable load test; local single samples are not capacity evidence |

## 11. Docker and Production Smoke

- Docker and Compose are installed.
- `docker-compose.staging.yml` and `docker-compose.prod.yml` do not exist at the repository root.
- Both requested staging commands failed with the exact missing-file error.
- Backend, MySQL, and frontend containers were therefore not started and no container login/major-flow claim is made.
- Only `backend/Dockerfile` was found; there is no verified frontend/DB orchestration path.

## 12. Database Integrity and Compatibility

- Dev and QA use H2 in MySQL mode with `ddl-auto=create-drop`; the live bug hunt therefore did not validate MySQL behavior.
- The so-called Flyway/database Playwright specs only call `/api/health`; they do not inspect Flyway history, schema objects, constraints, or migrations.
- Those specs are not discovered by the current project matcher.
- The customer FK test is stale: the service intentionally soft-deactivates customers, so expecting a hard-delete constraint error is incorrect.
- Mappers using `findById(...).ifPresent(...)` allow invalid references to reach the database as null values, demonstrated by BUG-004.
- Entity cascade mappings could be dangerous if a future code path hard-deletes parent customers; explicit lifecycle tests are required.

## 13. Final Verdict

**Not release ready.** The two high-severity authorization defects alone block release. Production smoke testing is impossible with the requested files absent, the main configuration can start with predictable credentials/secrets, and production dependencies have unresolved high findings. Existing green tests are useful but not sufficient because important security/database specs are not discovered and backend unit coverage is narrow.

## 14. Recommended Fix Order

- **Critical:** None classified, but add a release gate that fails when intended suites are undiscovered.
- **High:** BUG-001, BUG-002, production JWT/DB secret enforcement, dependency upgrades, restore verified compose environment.
- **Medium:** BUG-003 through BUG-008, MySQL/Flyway integration, dashboard query refactor.
**Low:** BUG-009, BUG-010, bundle/Browserslist maintenance.

## 15. Should We Fix Now?

No fixes have been made. **Approval is required before implementing any bug fix.**
