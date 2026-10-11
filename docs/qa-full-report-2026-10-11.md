# Sanitaryware CRM Full QA Report

Date: 2026-10-11
Branch: `frontend-redesign`
Environment: local Spring Boot QA JAR on `8081`, Vite frontend on `5173`, Playwright Chromium/Mobile projects

## Executive result

The repository contains 413 executable automated tests across the backend, frontend, mobile, release Playwright, and bug-hunt suites. The standard release workflow executed 142 Playwright tests: 107 passed and 35 failed. The separate bug-hunt workflow executed 22 tests: 18 passed and 4 failed. Backend, frontend unit, mobile unit, frontend production build, and mobile lint checks passed.

The project is not release-clean because 39 browser tests failed. Most failures are frontend contract drift between the current redesign and older Page Object/test selectors. The iPhone 13 failures are test-environment failures because Playwright WebKit cannot launch on this Windows host.

## Test matrix

| Suite | Executed | Passed | Failed | Skipped | Result |
|---|---:|---:|---:|---:|---|
| Backend Maven/JUnit | 243 | 243 | 0 | 0 | PASS |
| Frontend Node tests | 5 | 5 | 0 | 0 | PASS |
| Mobile Node tests | 1 | 1 | 0 | 0 | PASS |
| Playwright release suite | 142 | 107 | 35 | 0 | FAIL |
| Playwright bug-hunt suite | 22 | 18 | 4 | 0 | FAIL |
| **Total** | **413** | **274** | **39** | **0** | **FAIL** |

The repository does not currently contain more than 500 distinct executable test cases. The requested “500+” coverage is not present in the configured test inventory; many tests contain multiple assertions and workflow steps.

## Passed checks

- Backend compile and tests: `mvn test`, 243/243 passed, BUILD SUCCESS.
- Frontend unit tests: 5/5 passed.
- Mobile unit tests: 1/1 passed.
- Frontend production build: `vite build` passed, 1,589 modules transformed.
- Mobile lint: `eslint .` passed.
- Backend health check passed on `http://localhost:8081/api/health`.
- QA seed completed successfully. Existing duplicate seed data was handled by the seed script.
- Release API, database, and security Playwright coverage passed in the 142-test run.
- API bug-hunt and responsive viewport bug-hunt checks passed.

## Release-suite failures: 35

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

### Mobile failures

- Mobile Chrome dashboard widget test: expected `.card-container` was not found.
- Mobile Chrome invalid-login test: expected error alert was not found.
- All 8 Mobile Safari/iPhone 13 tests failed before test logic because `webkit-2311/Playwright.exe` returned `spawn UNKNOWN`.

## Bug-hunt failures: 4

- Warehouse role navigation did not expose the expected `Orders` link.
- Admin sidebar did not expose the expected `Distributor Payments` link.
- Sales product page did not expose the expected search placeholder.
- Sales brands page did not expose the expected `Brands` heading.

## Findings and priority

1. High: Align frontend Page Objects with the redesigned markup. Replace broad selectors such as `a:has-text(...) , button:has-text(...)` with role-based selectors scoped to the intended region.
2. High: Restore or update the UI contracts for audit logs, reports, orders, payments, purchase orders, attachments, and product details. These are functional workflow failures, not only selector issues.
3. Medium: Standardize visible copy for GST, error alerts, headings, and empty states, or update tests to the approved product copy.
4. Medium: Review role-based sidebar configuration for Warehouse/Admin/Sales navigation because bug-hunt tests found missing links and pages.
5. Environment: Install or repair the Playwright WebKit browser runtime on Windows before treating iPhone 13 results as application failures.

## Evidence

Playwright screenshots, videos, and error contexts are in `automation-tests/test-results/`. The HTML report is in `automation-tests/reports/` when generated by the configured reporter.

The backend source fix discovered during this run was added to `RegisterRequest` so the role field accessor compiles reliably. It must be committed and pushed with this report.
