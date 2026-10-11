# Sanitaryware CRM — pre-implementation inventory and UX audit

## Scope and safety

Inspected before frontend source edits on 11 September 2026. Starting branch: `ui-ux-redesign`; working branch created and confirmed: `frontend-redesign`. Git status, recent five commits, whitespace and diff-stat checks were inspected. No tracked modifications existed. Untracked `opencode.json` is existing user work. No backend, database, financial formula, or authorization rewrite is planned.

## Complete frontend inventory

React 18 / JavaScript, Vite 5, Tailwind 3, React Router 6, Zustand, Axios, Lucide, react-hot-toast. No chart, component, animation, form, or table libraries. `main.jsx` mounts StrictMode; `App.jsx` defines routes and seven lazy-loaded screens. Each protected route wraps its page in `DashboardLayout`. `ProtectedRoute` preserves login and allowed-role checks. Session authentication uses `sessionStorage`, token-free user state, Axios bearer injection, 401 redirect, logout revocation and BroadcastChannel synchronization. `useFilePreview` loads authenticated attachments and revokes object URLs. `ProductSearchSelect` is the sole shared business input. Styling lives in `index.css` and `tailwind.config.js`; no SCSS/theme/assets directories or local font assets exist. Product and brand images come from API records. Icons are Lucide. Dashboard charts are handwritten HTML/CSS.

Roles below: A = ADMIN, M = MANAGER, S = SALES, W = WAREHOUSE. These are actual route permissions, not inferred from business titles.

| Route(s) | Roles | Screen, data, controls and actions |
|---|---|---|
| `/`, `/dashboard` | A M S W | Root redirect; dashboard greeting; customer/order/revenue/supplier-payment KPIs; pending orders; low-stock warning; receivables/payables/net balance; monthly revenue bars; quick customer/quotation/order/PO creation; recent orders; top products table. Loading spinner, toast failure, chart/order empty states. |
| `/customers` | A M S | Server search name/email/phone, first 100 records. Columns: customer/location, email/phone, type, company, active status, edit/deactivate. Browser confirmation. |
| `/customers/new`, `/customers/edit/:id` | A M S | Name, type (retail/wholesale/contractor/builder), email, phone/alternate, company, GST, active checkbox, billing/shipping addresses, city/state/pincode, notes; save/cancel/back, email inline error, toast validation/failure, loading. Detail currently shares edit form. |
| `/products` | A M S W | Server search name/SKU/size/brand/barcode; category, brand, stock, active, min/max price, barcode, HSN filters; reset; page controls. Columns: image/name/SKU, size, brand/category, selling/MRP, stock/reorder threshold, tax/codes, status, view/edit/deactivate. Brands/categories links, bulk PDF import, ADMIN catalogue purge, create. |
| `/products/new`, `/products/edit/:id` | A M | SKU/name/description, category/brand, MRP/selling/purchase prices, GST, barcode/HSN, stock/reorder/unit, color/material/size/specifications, active/featured. Image gallery/upload/preview/primary/order/delete in edit mode. Save/cancel/back. Client and server error messages. |
| Product detail modal | A M S W | Image gallery/thumbnails, featured label, selling/MRP/tax, purchase price A/M only, inventory/reorder/active, barcode/HSN, specifications. Close/outside/Escape; partial focus trap. |
| Bulk import modal | A M | Brand select, PDF file, submit/progress, real processed/created/updated/images/skipped counts and warnings; close summary. |
| `/categories` | A M S; mutations A M | Local search name/description/parent; name/parent/description/status/actions table; back, create/edit/deactivate; modal name/parent/description/active/save/cancel. |
| `/brands` | A M | Local search name/description; logo/name/description/status/actions table; back/create/edit/delete; modal name/description/logo URL/active/save/cancel. |
| `/quotations` | A M S | First 100, local number/customer search; number/customer/issued-expiry/subtotal-total/approval/actions; create/edit/PDF/accept/reject. |
| `/quotations/new`, `/quotations/edit/:id` | A M S | Customer/date/valid-until; product filter and searchable product picker, add/remove lines, quantity, read-only unit price, discount %, line total; notes/terms; subtotal/tax % and amount/document discount/total; save/back/convert confirmation. Existing calculations must be preserved. |
| `/orders` | A M S W | First 100, local number/customer search; number/quotation/customer/date/delivery/total/payment status/fulfillment/actions. Create/edit/invoice A M S; status update A M S W. |
| `/orders/new`, `/orders/edit/:id` | A M S | Customer/date/delivery/order and payment status controls; product filter/picker; add/remove lines/quantity/editable selling price/discount/line total; shipping address/notes/bill-pad upload and preview; subtotal/GST/shipping/discount/total; save buttons; payment link; `?fromQuotation` prefill. |
| `/payments` | A M S | Local receipt/order/receiver search; receipt/order/date/amount/method/receiver table; loading/empty/toast. |
| `/payments/new?orderId=…` | A M S | Order summary/total/balance; amount/date/method/reference/notes; receipt submit/back; positive amount and balance checks. Bare `/payments/new` has no order selector. |
| `/distributors` | A M | Server name/phone search, first 100; supplier/contact/GST/email/phone/location/outstanding/active/actions. Create/edit/delete/toggle status, browser confirmation; inert Filters button. |
| `/distributors/new`, `/distributors/edit/:id` | A M | Name/contact/phones/email/GST/address/city/state/pincode/bank/account/IFSC/opening balance on create/active/notes; save/cancel/back. |
| `/purchase-orders` | A M | First 100, local PO/supplier search; number/date/supplier/status/payment/total/balance/actions. Create/edit/delete/receive. Receive modal shows supplier/total/item count/inventory effect/cancel/confirm/progress. |
| `/purchase-orders/new`, `/purchase-orders/edit/:id` | A M | Supplier/dates/status/PDF upload/authenticated preview; product filter/native select, quantity/received quantity/unit cost/line total/codes, add/remove; notes/GST/subtotal/paid/total/balance; save/back. Received-state disabling; status and receive APIs authoritative. |
| `/distributor-payments` | A M | First 100, local receipt/supplier/reference search; receipt/date/supplier/PO/method/reference/amount/actions; create/view/revert confirmation. |
| `/distributor-payments/new`, `/distributor-payments/edit/:id` | A M | Supplier and optional outstanding PO selector; `?poId` prefill; total/balance/amount/date/method/reference/notes; record/back. Existing edit path incorrectly creates payments (ID unused). API supports read, create, delete, not update. |
| `/reports` | A M | Six views: sales, customer outstanding, distributor outstanding, payment, purchase, inventory. Date filters for sales/payment/purchase; apply/clear/refresh. Each has 2–4 KPIs and corresponding breakdown table; no functional export. Loading, empty, toast errors. |
| `/audit-logs` | A M | Server actor/action/entity/type/ID/from/to filters; reset/refresh/page/page-size. Timestamp/actor/action/entity/details table plus mobile cards; skeleton, retry error, clear-filter empty state. |
| `/settings` | A M | Company/GST/logo URL/currency/email/phone/website/address/city/state/pincode, save; loading/toasts. No user administration embedded. |
| `/profile` | Authenticated | Name/email/phone/current/new/confirm password; save, identity/role, password mismatch and API feedback. |
| `/login` | Public | Username/password/sign-in/loading/inline and duplicate toast error/register link. |
| `/register` | Public route, server-controlled | Name/username/email/phone/password/register/sign-in. First account ADMIN; subsequent registration A/M only, creates SALES. No user list/role editing endpoint or screen exists. |
| `*`, forbidden route | Public / authenticated | Not-found back/home; forbidden explanation/dashboard action. |

All forms use local state; global state only authentication. Service modules inspected: api, auth, auditLog, customer, dashboard, distributor, distributorPayment, fileUpload, order, payment, product (including brand/category), purchaseOrder, quotation, report, settings. Existing statuses and payment methods are API enums. No drawers, notifications, global search, selection/bulk-selection table, independent inventory route, customer ledger screen, or order history API is implemented.

Tests: `npm test` runs five Node tests for document totals/payment search (baseline 5 pass). Frontend's legacy E2E file has obsolete selectors and is not wired to npm test. Maintained Playwright suite lives in `automation-tests`: login/dashboard/customers/products/categories/quotations/orders/payments/distributors/PO/reports/audit/attachments/full CRM flow, mobile and security suites. Baseline build passes: main JS 388.20 kB (105.56 gzip), CSS 55.79 kB. No lint/typecheck script. Backend health initially unavailable at localhost:8081.

## Role workflows

| Role | Frequent tasks and immediate context | Excluded areas / friction |
|---|---|---|
| ADMIN | Business overview, financial reports, catalogue setup/import, supplier purchasing/payment, account creation, settings/audit | Catalogue purge remains ADMIN only. Flat navigation and hidden Brands slow setup. |
| MANAGER | Monitor orders/stock/receivables, create sales documents, receive purchases, manage catalogue/customers/suppliers, reports | No ADMIN catalogue purge. Existing route access includes reports/settings/audit; preserve it. |
| SALES | Find product price/stock, create customer, quote, convert to order, collect payment, download invoice | No purchase prices, purchasing, Brands route, reports/settings/audit. Categories read-only. Repeated product filtering, obscure totals and payment entry increase effort. |
| WAREHOUSE | Find stock and SKU, monitor delivery and update fulfillment | No customers/quotes/payments/purchasing/reports/settings/audit/category route or product edit. Dashboard should emphasize stock/orders rather than supplier finances. |

Task frequency is a workflow hypothesis based on permitted operations, not measured user research. Validate with employees after rollout.

## CURRENT UI/UX AUDIT

| Problem / affected screens | Why it matters | Severity | Recommended redesign |
|---|---|---|---|
| Flat, long sidebar; Brands missing; edit routes lose active highlight | Poor orientation and unnecessary clicks | High | Role-filtered groups, prefix matching, collapsed rail and mobile drawer |
| Header generic on payments/reports/audit; duplicated context | Users cannot identify location | Medium | Breadcrumbs and one page-level heading/action hierarchy |
| Fabricated health indicators on shell/dashboard | Misrepresents system reliability | High | Remove claims; render actual loading/error/update feedback |
| Gradients/glows/oversized hero/rounded cards/bouncing alert | Distracts from work; wastes first viewport | Medium | Calm borders, restrained radii, operational attention section |
| Tiny uppercase and pale secondary text across tables/forms | Reading fatigue, contrast issues | High | 14px body, 12–13px captions/headers, accessible semantic colors |
| Multiple blue/teal/red/green button implementations | Meaning and primary action unclear | High | Shared button variants/states, one main action |
| Labels not associated across most forms | Screen-reader and click-to-focus failures | High | Shared labeled fields; explicit error/help associations |
| Search placeholders only; submit behavior inconsistent | Users do not know how to search | High | Visible search labels, explicit server Search action, clear controls |
| Fixed first-100 fetches, no pagination on most lists | Records appear missing | High | Server pagination where supported; clearly scoped client filtering |
| Empty check before filtering on orders/quotes | Blank table on no matches | Medium | Shared table empty/no-results rendering |
| Toast-only errors become zero/empty data | False business conclusions, no recovery | High | Persistent error and retry, distinguish empty from failure |
| Modal behavior duplicated/incomplete | Keyboard escapes background or cannot close; scroll leaks | High | Native modal dialog foundation, named title, focus return, scroll lock |
| Product picker click-only/nested button/clipped popup | Keyboard and mobile line-item entry blocked | High | Accessible searchable selection dialog with real API search |
| Wide tables squeezed/scrolled without guidance | Mobile loses record identity and action | High | Record layouts for lists, labeled stacked line items, contained report scrolling |
| Inconsistent numeric alignment and financial language | Difficult comparison and payment decisions | High | Tabular right-aligned figures, clear subtotal/tax/discount/grand total |
| Save replaces edit forms with full spinner | Loses context on operation failures | Medium | Separate initial-loading and saving feedback |
| Order state menus offer incompatible choices | Avoidable rejected transitions | High | Reflect verified backend transitions; backend remains authoritative |
| Supplier payment detail opens creation form | Risk of recording duplicate payment | Critical | Read-only detail using existing getPaymentById; preserve create path |
| Bare payment entry has no order selection | Dead-end workflow | High | Existing-order selector and real balance summary |
| Order bill-pad references nonexistent getFileUrl | Runtime crash on attached orders | High | Reuse authenticated useFilePreview hook |
| Reports reset uses stale closure; possible stale requests | Wrong report visible for chosen filters | High | Explicit filter parameters and latest-request guard |
| Inert distributor Filters button | Misleading affordance | Medium | Actual local status filter or remove inert control |
| Public registration wording promises open signup | Contradicts bootstrap/managed registration | High | Explicit initial setup copy; A/M account creation entry |
| Missing headings on form pages and icon-only names | Navigation/assistive technology ambiguity | High | One h1, named buttons, clear sections |
| Hover-only chart values and decorative financial bars | Information unavailable to touch/keyboard | Medium | Visible monthly figures with accessible chart/table semantics |
| Missing reduced-motion/focus system | Accessibility gap across shell and controls | High | Global focus ring and reduced-motion override |
| Product image preview URLs not revoked | Memory growth during long sessions | Medium | Cleanup preview URLs and lazy thumbnails |
| Many eagerly imported routes | Excess initial download | Medium | Route-level splitting; no new heavy dependencies |
| Truncated details and overly technical copy | Employees need training to interpret UI | Medium | Wrapping descriptions, plain business labels, expandable detail |

## Proposed information architecture

Dashboard; Sales (Customers, Quotations, Orders, Payments); Catalogue (Products & inventory, Categories, Brands); Purchasing (Distributors, Purchase Orders, Distributor Payments); Insights (Reports); Administration (Audit Logs, Settings, Create user when permitted); Account menu (Profile, Sign out). Hide unauthorized groups/items. Keep route contracts. No fabricated notifications/search/history.

## Design system established before pages

Classic modern enterprise: neutral stone background, white surfaces, ink text, deep teal primary, navy navigation; data over decoration. Semantic variables: background, surface, surface-elevated, surface-muted, border/strong, text-primary/secondary/muted, primary/hover/active, success/warning/danger/info, disabled. Colors centralized in theme, never per-page hex.

Typography: system sans stack (no blocking font download); page 24/32 weight 650, section 18/26, card 16/24, body/table 14/21, header/label 13/20 weight 600, helper/caption 12/18, numeric 24/32 tabular, financial total 26/34 tabular. Spacing: 4,8,12,16,20,24,32,40,48. Radii: 4/6/8/12 (12 for dialogs); one subtle overlay shadow, bordered surfaces. Lucide 16–20px icons, decorative icons hidden from assistive tech.

Buttons: primary, secondary outlined, tertiary, ghost, danger, icon; small 36px, medium 40px, large 44px; touch controls 44px on mobile; hover/active/focus/disabled/busy states. Explicit action labels. Forms: visible associated label, required marker, help/error, native type/autocomplete, consistent section/grid/action footer. Tables: shared semantic wrapper/column support, busy/empty/error, sticky headers, right-aligned numeric cells, pagination, contextual actions where useful. StatusBadge: consistent semantic map, text always present; neutral method/entity labels.

Responsive: >=1024 desktop sidebar, 240px expanded/72px rail; below 1024 modal navigation drawer. Content min-width:0, bounded 1440px workspace; tablet two-column forms only where readable; mobile one-column fields and action stacks. Lists use labeled records, document editors stacked line-item fields; dense report tables use named, focusable contained scroll regions. Verify 1440x900,1280x800,1024x768,768x1024,430x932,390x844. Never hide access to record actions.

Motion: 140ms controls, 180ms menus/dialogs, 220ms sidebar; opacity/small translation only, no page fades, bounce, zoom, or table animation. Reduced-motion disables movement. Native dialog modal behavior plus focus restoration/background scroll lock; initial focus at title or safe action.

Reusable plan: Button/IconButton, PageHeader/Section/StatCard, Field/SearchInput/FilterBar, DataTable/Table/Pagination, StatusBadge, Modal/ConfirmProvider, LoadingSkeleton/EmptyState/ErrorState, navigation metadata/Sidebar/TopBar, shared document and attachment presentation. Preserve useful existing form handlers/services rather than recreating business logic.

## Implementation and validation sequence

1. Tokens/typography, shell/navigation/header, buttons/forms/tables/status/feedback/dialog foundation.
2. Dashboard; customer/product/category/brand workflows.
3. Quotation/order/payment; distributors/PO/supplier-payment workflows.
4. Reports/audit/settings/profile/login/registration; cross-page integration.
5. At phase boundaries: npm test, npm run build, diff review, browser/console/responsive checks when available. Start local real QA backend for functional smoke; no production mocks. Preserve tests' business assertions; adapt only selectors to intentional interaction changes.
6. Final keyboard/dialog/role checks, all six viewports, workflow smoke, final diff check/status/stat, evidence-based report with unverified areas explicitly identified.
