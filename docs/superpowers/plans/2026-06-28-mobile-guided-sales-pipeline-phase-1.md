# Mobile Guided Sales Pipeline Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lean mobile customer-to-payment sales workflow using existing backend APIs.

**Architecture:** Extend the current Expo React Native app without replacing bottom tabs or generic list screens. Add focused stack screens, service methods, small reusable UI components, and pure quotation calculation helpers.

**Tech Stack:** Expo React Native, React Navigation, Axios, existing Spring Boot REST API.

---

### Task 1: Add Calculation Utilities

**Files:**
- Create: `mobile/src/utils/quotationTotals.js`
- Create: `mobile/src/utils/quotationTotals.test.mjs`

- [ ] Add pure helpers for numeric parsing, line totals, quotation totals, and backend payload assembly.
- [ ] Add a Node-compatible smoke test for helper behavior.
- [ ] Run `node src/utils/quotationTotals.test.mjs` from `mobile/` and confirm it passes.

### Task 2: Extend Mobile API Services

**Files:**
- Modify: `mobile/src/api/services.js`

- [ ] Keep current `listServices` and `fetchList` exports unchanged.
- [ ] Add `customerService`, `productService`, `quotationService`, `orderService`, and `paymentService`.
- [ ] Reuse the existing `api` axios client for every method.

### Task 3: Make Supported Lists Pressable

**Files:**
- Modify: `mobile/src/components/ListCard.js`
- Modify: `mobile/src/screens/ListScreen.js`

- [ ] Add optional `onPress` behavior to `ListCard`.
- [ ] Add route mapping for `customers`, `quotations`, and `orders`.
- [ ] Preserve non-pressable behavior for all other lists.

### Task 4: Add Reusable Detail/Form Components

**Files:**
- Create: `mobile/src/components/DetailSection.js`
- Create: `mobile/src/components/FieldRow.js`
- Create: `mobile/src/components/PrimaryActionBar.js`
- Create: `mobile/src/components/AppTextInput.js`
- Create: `mobile/src/components/AppSelect.js`
- Create: `mobile/src/components/FormErrorBanner.js`

- [ ] Keep components module-neutral and theme-consistent.
- [ ] Support disabled button states and compact field rendering.

### Task 5: Add Sales Pipeline Screens

**Files:**
- Create: `mobile/src/screens/CustomerDetailScreen.js`
- Create: `mobile/src/screens/QuotationFormScreen.js`
- Create: `mobile/src/screens/ProductPickerScreen.js`
- Create: `mobile/src/screens/QuotationDetailScreen.js`
- Create: `mobile/src/screens/OrderDetailScreen.js`
- Create: `mobile/src/screens/PaymentFormScreen.js`

- [ ] Implement customer detail with customer quotations/orders.
- [ ] Implement quotation form with product picker, line items, totals, validation, and save.
- [ ] Implement quotation detail with conversion confirmation.
- [ ] Implement order detail with payment history and refresh.
- [ ] Implement payment form with validation, submit, and return refresh.

### Task 6: Wire Navigation

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.js`

- [ ] Register all new stack screens.
- [ ] Keep bottom tabs unchanged.
- [ ] Ensure mutation returns refresh destination screens.

### Task 7: Verify

**Files:**
- No code files.

- [ ] Run `node src/utils/quotationTotals.test.mjs` from `mobile/`.
- [ ] Run `npm run lint` from `mobile/`.
- [ ] Run `npm run ui:smoke` from `mobile/` if the environment supports it.
- [ ] Report manual smoke status and blockers.
