# Manual Functional QA Report - 2026-10-12

## Scope

This report records the current authenticated Chromium manual pass against the disposable QA environment.

- Branch: `frontend-redesign`
- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:8081/api/health`
- Role exercised: `ADMIN` (`QA Admin User`)
- Browser: Chromium through the connected Chrome browser
- Desktop viewport checks: authenticated route scan at the browser desktop size, plus dashboard and primary form checks at `1366x768` and `1920x1080`
- Mobile viewport checks: Pixel 5-sized `393x851`, iPhone 13-sized `390x844`
- No commit or push was performed.

## Repository feature inventory

The repository contains authentication/profile, dashboard, customers, brands, categories, products/catalogue, product images, distributors, purchase orders, distributor payments, quotations, orders, customer payments, reports, audit logs, settings, file upload/download, role-based authorization, and responsive mobile layouts.

The product catalogue UI includes a PDF bulk-import workflow. There is no separate first-class `/price-lists` route; price-list behavior is represented by catalogue import and product pricing fields.

The supplied catalogue PDFs are:

1. `C:\Users\akhil\OneDrive\Desktop\products\【Split】 DOC-20260724-WA0015.pdf` - 50 pages.
2. `C:\Users\akhil\OneDrive\Desktop\products\Final JBD Pricelist June Edition - 03.06.26 High-Res.pdf` - 96 pages.
3. `C:\Users\akhil\OneDrive\Desktop\products\Master - Ashirvad by Aliaxis - New Price List - 100826.pdf` - 110 pages.
4. `C:\Users\akhil\OneDrive\Desktop\products\Parryware Aug 26 Pricelist Searchable.pdf` - 233 pages.

## Manual results

### Route matrix

| Route | ADMIN desktop | iPhone-sized viewport | Heading/empty/loading behavior | Result |
|---|---:|---:|---|---|
| `/dashboard` | Pass | Pass | Dashboard greeting, analytics, quick actions, recent orders | PASS |
| `/customers` | Pass | Pass | Customer Directory and empty state | PASS; actions have distinct accessible names and stable test IDs |
| `/products` | Pass | Pass | Product Catalog, filters, empty state | PASS |
| `/brands` | Pass | Pass | Brands page and search | PASS |
| `/categories` | Pass | Pass | Categories and empty state | PASS |
| `/distributors` | Pass | Pass | Distributors and search | PASS |
| `/purchase-orders` | Pass | Pass | Purchase Orders and empty state | PASS |
| `/distributor-payments` | Pass | Pass | Distributor Payments and empty state | PASS |
| `/quotations` | Pass | Pass | Sales Quotations and empty state | PASS |
| `/orders` | Pass | Pass | Customer Orders and empty state | PASS |
| `/payments` | Pass | Pass | Payments and empty state | PASS |
| `/reports` | Pass after render wait | Pass | Six report tabs and Sales Summary default | PASS |
| `/audit-logs` | Pass | Pass | Audit Trail & System Logs and filters | PASS |
| `/settings` | Pass | Pass | System Settings sections and save action | PASS |
| `/profile` | Pass | Pass | Profile, personal information, password sections | PASS |

All tested viewports reported no horizontal overflow. The required desktop and mobile dashboard headings rendered after allowing the normal async render to settle.

### Reports tabs

The following tabs were clicked and verified to replace the report heading:

- Sales Summary
- Customer Outstanding
- Distributor Outstanding
- Payment Summary
- Purchase Summary
- Inventory Summary

### Catalogue/import workflow

The Product Catalog page exposed and opened the `Bulk Import Catalog (PDF)` dialog. The dialog visibly contained:

- Required brand selector.
- File chooser.
- PDF-only guidance.
- Product-family/SKU/HSN/size/price/description/image extraction note.
- Disabled `Start Import` before brand/file selection.
- Close control.

The disposable `【Split】 DOC-20260724-WA0015.pdf` was submitted in the refreshed QA backend. The request returned HTTP 200 in approximately 69.4 seconds with a batch ID, 1,293 created products, 5 updated products, 1,298 total processed, 1,212 linked images, and zero skipped rows. The follow-up `npm run cleanup` completed and deactivated exactly 1,293 catalogue products. The other large PDFs were not submitted.

### Forms and modal smoke checks

The following primary actions were opened from the ADMIN UI:

- Add Brand
- Add Category
- Add Customer
- Add Distributor
- Create PO
- New Quotation
- New Order

Brand and category opened accessible dialogs. The remaining actions navigated to their form pages. The Add Customer page-header link and empty-state action were verified as distinct accessible controls; no duplicate-control ambiguity remained in the current build.

## Authenticated role-session rerun — 2026-10-12

Fresh browser sessions were run for ADMIN, MANAGER, SALES, and WAREHOUSE against the local QA services. All four accounts authenticated successfully with credentials supplied through the QA environment. The visible navigation matched the role contract: ADMIN and MANAGER exposed administration/purchasing links, SALES exposed customer/sales/catalogue read workflows, and WAREHOUSE exposed orders/products. Direct `/settings` access rendered the application Access denied state for SALES and WAREHOUSE. No browser console error-level entries were observed in these sessions.

The current automated endpoint and workflow verification is green: API 75/75, frontend E2E 36/36, database 4/4, security 11/11, bug-hunt 22/22, and mobile viewport 16/16. The broader Playwright invocation completed 142/142 across Chromium, Pixel 5, and iPhone 13/WebKit.

## Findings

### QA-002 - Catalogue import result/cleanup verification - resolved

- Original severity: major
- Role: ADMIN
- URL: Product Catalog bulk import dialog
- Fix: the importer avoids a batch-wide transaction rollback from one bad row, validates product price bounds before persistence, and the modal keeps backend errors visible in an accessible alert.
- Verification: the PDF returned HTTP 200 with batch ID `f9b312ef-8963-40de-aff8-6e3d437e2579`, 1,293 created, 5 updated, 1,212 linked images, and 0 skipped. Cleanup deactivated 1,293 imported products.
- Security/data note: the QA/dev cleanup endpoint is restricted by profile/authorization; imported category rows remain for referential safety.

## Security/design observations

- No browser console error-level entries or React Router future-flag warnings were observed after the remediation pass.
- The ADMIN sidebar exposed Customers, Quotations, Orders, Payments, Products, Categories, Distributors, Purchase Orders, Distributor Payments, Reports, Audit Logs, and Settings.
- No horizontal overflow was observed at the tested desktop or mobile viewport sizes.
- Product catalogue has clear loading/empty affordances and a visible PDF-only import constraint.
- Full authorization coverage for MANAGER, SALES, and WAREHOUSE requires separate authenticated sessions; it was not claimed from the ADMIN session.

## Coverage limitations

The following remain outside the scope of this manual browser pass:

- Full create/edit/delete mutation walkthroughs for every entity under every role (role authorization is covered by API/E2E tests).
- Create/edit/delete mutations for every entity.
- Four large PDF imports and downstream product/price-list verification.
- Upload/delete/download flows with disposable files.
- Payment, quotation acceptance, order conversion, receiving, and inventory mutations.
- Exhaustive direct unauthorized-route checks for every restricted path under every non-admin role.

These are explicitly unverified, not skipped or assumed to pass.
