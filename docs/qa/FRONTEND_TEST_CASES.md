# FRONTEND TEST CASES

This document describes the interface validations, state behaviors, and routing protections inside the React/Vite admin portal.

---

## 1. Authentication Screens

### Sign In Page
* **Component**: `Login.jsx`
* **User Action**: Open page, type details, click Sign In.
* **Expected UI Result**: Loading spinner is shown, login button is disabled, redirects to `/dashboard` upon success.
* **Expected API Call**: `POST /api/auth/login`
* **Pass/Fail Criteria**: Passes if login succeeds and token is stored in sessionStorage.

### Registration Page
* **Component**: `Register.jsx`
* **User Action**: Complete registration form, click Register.
* **Expected UI Result**: Bypasses browser Content Security Policy via relative path `/api` proxy, triggers success toast notification, redirects to `/login`.
* **Expected API Call**: `POST /api/auth/register`
* **Pass/Fail Criteria**: Account is created in database.

---

## 2. Catalog Portals

### Category Listing
* **Component**: [CategoryListPage.jsx](file:///d:/SanitarywareCRM/frontend/src/pages/categories/CategoryListPage.jsx)
* **User Action**: View screen, type search keywords, toggle filters.
* **Expected UI Result**: Renders table displaying parent category names and active/inactive status badges.
* **Expected API Call**: `GET /api/categories`
* **Pass/Fail Criteria**: Displays list dynamically with zero static mockup records.

### Category Editor Form
* **Component**: [CategoryFormModal.jsx](file:///d:/SanitarywareCRM/frontend/src/pages/categories/CategoryFormModal.jsx)
* **User Action**: Click Add, fill fields, select Parent Category dropdown, save.
* **Expected UI Result**: Displays options inside parent selector dynamically, submits POST, modal closes and refreshes list.
* **Expected API Call**: `POST /api/categories`
* **Pass/Fail Criteria**: Saved sub-category displays correct parent name tag.

### Products Dashboard
* **Component**: [ProductListPage.jsx](file:///d:/SanitarywareCRM/frontend/src/pages/products/ProductListPage.jsx)
* **User Action**: Click the "Categories" secondary button.
* **Expected UI Result**: Bypasses dead button logic, redirects viewport cleanly to `/categories` route.
* **Expected API Call**: None (client routing trigger).
* **Pass/Fail Criteria**: URL changes to `/categories` and list screen loads.

---

## 3. Operations & Invoices

### Quotations Index
* **Component**: [QuotationListPage.jsx](file:///d:/SanitarywareCRM/frontend/src/pages/quotations/QuotationListPage.jsx)
* **User Actions**:
  1. Click checkmark icon: Transitions status tag to `ACCEPTED` in UI.
  2. Click cross icon: Transitions status tag to `REJECTED` in UI.
  3. Click PDF download icon: Downloads quotation file matching invoice schema format.
* **Expected API Calls**:
  1. `PATCH /api/quotations/{id}/status?status=ACCEPTED`
  2. `PATCH /api/quotations/{id}/status?status=REJECTED`
  3. `GET /api/quotations/{id}/pdf`
* **Pass/Fail Criteria**: Operations complete without UI freezing or showing generic exception popups.

### Orders Index
* **Component**: [OrderListPage.jsx](file:///d:/SanitarywareCRM/frontend/src/pages/orders/OrderListPage.jsx)
* **User Action**: Click PDF download button.
* **Expected UI Result**: File downloaded with name `invoice-{orderNumber}.pdf`.
* **Expected API Call**: `GET /api/orders/{id}/invoice/pdf` (streams array bytes blob).
* **Pass/Fail Criteria**: Downloads binary invoice PDF containing correct totals.
