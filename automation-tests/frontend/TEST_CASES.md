# Frontend Admin Test Cases

> [!NOTE]
> **Status**: Not executed yet (Staged for local automation).

---

## 1. Positive Test Cases (POS-036 to POS-060)

| Test ID | Page | Scenario | Preconditions | Test Steps | Expected UI Result | Expected API Call | Priority | Automation Tool |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POS-036** | Login | Sign In successfully | URL is loaded | Fill credentials, click Sign In | Navigates to dashboard, success toast shows. | `POST /api/auth/login` | Critical | Playwright |
| **POS-037** | Route | Protected route redirection | User authenticated | Navigate to `/products` path | Content renders, sidebar is active. | `GET /api/products` | High | Playwright |
| **POS-038** | Dashboard | Stats widgets render | Dashboard loaded | Inspect widgets values | Revenue, Orders, Products cards display numbers. | `GET /api/dashboard/stats` | Medium | Playwright |
| **POS-039** | Category | Categories list render | Categories exist | Click "Categories" button in Sidebar | List table renders categories and parent names. | `GET /api/categories` | High | Playwright |
| **POS-040** | Category | Create category modal | Category list | Click Add Category, fill name, click save | Modal closes, category added, table refreshed. | `POST /api/categories` | High | Playwright |
| **POS-041** | Product | Products list render | Products exist | Navigate to `/products` | Products table renders SKU, Name, MRP, Stock. | `GET /api/products` | High | Playwright |
| **POS-042** | Product | Create product form | Product form open | Fill name, SKU, price, select brand, click save | Redirects to list, success message shows. | `POST /api/products` | High | Playwright |
| **POS-043** | Brand | Create Brand modal | Brand list open | Click "Add Brand", fill name, save | Modal closes, brand added to table list. | `POST /api/brands` | Medium | Playwright |
| **POS-044** | Customer | Create Customer form | Customer list open | Click "Add Customer", fill form, save | Redirects to list, customer appears in table. | `POST /api/customers` | High | Playwright |
| **POS-045** | Distributor | Create Distributor form | Distributor list | Click "Add Distributor", fill form, save | Redirects to list, distributor appears. | `POST /api/distributors` | Medium | Playwright |
| **POS-046** | Product | Categories button redirect | Products list | Click "Categories" button | Navigates to `/categories`. | None | High | Playwright |
| **POS-047** | Quotation | Create Quotation form | New quotation | Select customer, add product, enter qty, save | Redirects to list, quotation is in `DRAFT`. | `POST /api/quotations` | High | Playwright |
| **POS-048** | Quotation | Download Quotation PDF | Quotations list | Click "Download PDF" icon button | Starts native browser download for PDF file. | `GET /api/quotations/{id}/pdf` | High | Playwright |
| **POS-049** | Quotation | Accept Quotation from UI | Quotation in `SENT` | Click checkmark "Accept" button | Status badge updates to `ACCEPTED`. | `PATCH /api/quotations/{id}/status?status=ACCEPTED` | High | Playwright |
| **POS-050** | Quotation | Reject Quotation from UI | Quotation in `SENT` | Click "Reject" button | Status badge updates to `REJECTED`. | `PATCH /api/quotations/{id}/status?status=REJECTED` | High | Playwright |
| **POS-051** | Quotation | Convert to Order button | Accepted quotation | Click "Convert to Order" button | Navigates to order detail summary view. | `POST /api/orders/from-quotation/{id}` | High | Playwright |
| **POS-052** | Order | List orders | Orders exist | Navigate to `/orders` | Renders list with Order numbers, statuses. | `GET /api/orders` | Critical | Playwright |
| **POS-053** | Order | Download Invoice PDF | Orders list | Click "Download Invoice" icon button | Starts native browser download for PDF. | `GET /api/orders/{id}/invoice/pdf` | High | Playwright |
| **POS-054** | Payment | Record Payment form | Order detail open | Click "Record Payment", fill amount, submit | Redirects, balance shows decreased. | `POST /api/payments` | Critical | Playwright |
| **POS-055** | Purchase Order | Create PO | PO form loaded | Select distributor, products, save | Redirects, PO created in `DRAFT`. | `POST /api/purchase-orders` | Medium | Playwright |
| **POS-056** | Product | Search catalog | Products list | Type search term in filter box | Table filters to matched products. | `GET /api/products/search` | High | Playwright |
| **POS-057** | Global | Sidebar Navigation | Any page | Click "Customers" link on sidebar | View renders customer lists seamlessly. | `GET /api/customers` | High | Playwright |
| **POS-058** | Settings | View Settings | Admin logged in | Navigate to `/settings` | Displays company information fields. | `GET /api/settings` | Low | Playwright |
| **POS-059** | Settings | Edit Settings | Settings loaded | Change phone number, click save | Success message, values updated. | `PUT /api/settings` | Low | Playwright |
| **POS-060** | Auth | Logout | Logged in | Click Logout on profile menu | Session cleared, redirected to `/login`. | None | High | Playwright |

---

## 2. Negative Test Cases (NEG-041 to NEG-065)

| Test ID | Page | Scenario | Preconditions | Test Steps | Expected UI Result | Expected API Call | Priority | Automation Tool |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NEG-041** | Login | Sign In with bad password | URL loaded | Fill username, wrong password, submit | Error alert "Bad credentials", remains on login. | `POST /api/auth/login` | Critical | Playwright |
| **NEG-042** | Login | Submit empty login form | URL loaded | Click Sign In button directly | Validator highlights fields, blocks request. | None | High | Playwright |
| **NEG-043** | Category | Create duplicate category error | Modal open | Fill existing name "Pipes", click save | Modal stays open, shows error message. | `POST /api/categories` | High | Playwright |
| **NEG-044** | Product | Create product validation error| Form open | Leave Name blank, save | Form highlights field, does not submit. | None | High | Playwright |
| **NEG-045** | Product | Create product negative price | Form open | Fill price `-100`, save | Validation error message displayed. | None | High | Playwright |
| **NEG-046** | Product | Create duplicate SKU error | Form open | Fill existing SKU, save | Form stays open, toast displays SKU error. | `POST /api/products` | High | Playwright |
| **NEG-047** | Customer | Create duplicate phone error | Form open | Fill existing phone number, save | Toast shows: "Phone number already registered". | `POST /api/customers` | High | Playwright |
| **NEG-048** | Customer | Invalid email format | Form open | Fill `invalid-email`, save | Inline validator says "Invalid email format". | None | Medium | Playwright |
| **NEG-049** | Customer | Invalid phone characters | Form open | Fill `abc1234`, save | Blocks alphabetic input in phone field. | None | Medium | Playwright |
| **NEG-050** | Quotation | Submit empty quotation items | Form open | Select customer, leave items list empty, save| Toast warns: "Add at least one item". | None | High | Playwright |
| **NEG-051** | Quotation | Discount percentage exceeds 100 | Form open | Fill discount percentage `105`, save | Validation error: "Discount cannot exceed 100%". | None | Medium | Playwright |
| **NEG-052** | Quotation | Convert quotation fails (No stock)| Accepted quote | Click "Convert to Order" | Conversion error toast: "Insufficient stock". | `POST /api/orders/from-quotation/{id}` | High | Playwright |
| **NEG-053** | Order | Record payment exceeds balance | Form open | Enter payment amount greater than balance, save| Toast: "Payment amount exceeds balance due". | `POST /api/payments` | Critical | Playwright |
| **NEG-054** | Route | Blocked route redirect | Logged out | Navigate to `/dashboard` manually | Redirects to `/login`. | None | Critical | Playwright |
| **NEG-055** | Global | Network disconnected offline | Running | Trigger network disconnect | Global alert: "You are offline. Reconnecting...". | Any request | High | Playwright |
| **NEG-056** | Product | Search with no matches | Products open | Search `xyzzy` | Displays: "No products found". | `GET /api/products/search` | Low | Playwright |
| **NEG-057** | Category | List load fails | Server down | Navigate to Categories | Displays: "Failed to fetch categories". | `GET /api/categories` | High | Playwright |
| **NEG-058** | Product | Image upload size limit | Form open | Select 20MB image file | Toast: "File exceeds maximum size of 5MB". | None | Medium | Playwright |
| **NEG-059** | Product | Image upload type limit | Form open | Select `document.txt` | Toast: "Invalid file type. Only images allowed".| None | Medium | Playwright |
| **NEG-060** | Quotation | Download PDF network failure | List loaded | Server goes down, click Download PDF | Toast: "Failed to download PDF". | `GET /api/quotations/{id}/pdf` | High | Playwright |
| **NEG-061** | Order | Download Invoice network failure | List loaded | Server goes down, click Download Invoice | Toast: "Failed to download invoice". | `GET /api/orders/{id}/invoice/pdf` | High | Playwright |
| **NEG-062** | Global | Server API 500 error handling | Any page | Trigger server crash | Toast: "Internal server error occurred". | Any request | High | Playwright |
| **NEG-063** | Settings | Missing required config fields | Settings open | Clear email, save | Validator highlights email field. | None | Low | Playwright |
| **NEG-064** | Distributor| Create duplicate distributor phone| Form open | Fill existing phone, save | Toast: "Phone number already registered". | `POST /api/distributors` | High | Playwright |
| **NEG-065** | Purchase Order| Create PO negative quantity | Form open | Fill quantity `-10` | Inline validation error message displayed. | None | Medium | Playwright |
