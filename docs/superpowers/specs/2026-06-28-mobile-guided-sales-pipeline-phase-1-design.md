# Mobile Guided Sales Pipeline Phase 1 Design

## Goal

Build a lean field-sales workflow in the React Native mobile app:

Login -> Customer List -> Customer Detail -> Create Quotation -> Add Product Line -> Save Quotation -> Quotation Detail -> Convert To Order -> Order Detail -> Record Payment -> Order Detail Updated.

This phase keeps mobile focused on customer-facing sales work. It does not add admin parity, distributor write workflows, product management, customer editing, offline drafts, delivery screens, or notification features.

## Current Context

The mobile app lives in `mobile/` and uses Expo React Native with React Navigation. The existing bottom tabs stay in place. Generic list screens already fetch live backend data through `mobile/src/api/services.js`, with JWT authorization provided by `mobile/src/api/client.js`.

The backend already exposes the API paths needed for this phase:

- `GET /customers/{id}`
- `GET /quotations/customer/{customerId}`
- `GET /orders/customer/{customerId}`
- `GET /quotations/{id}`
- `POST /quotations`
- `GET /orders/{id}`
- `POST /orders/from-quotation/{quotationId}`
- `GET /payments/order/{orderId}`
- `POST /payments`
- `GET /products`
- `GET /products/search`

The mobile request payloads will match the existing backend DTOs and web app forms. Quotation items use `productId`, `quantity`, `unitPrice`, `discountPercentage`, `lineTotal`, and optional `notes`. Payment creation uses `orderId`, `paymentDate`, `amount`, `paymentMethod`, `referenceNumber`, and `notes`.

## Architecture

The implementation will extend the current mobile app instead of replacing its generic list system.

`mobile/src/navigation/AppNavigator.js` will keep the existing bottom tabs and add stack screens:

- `CustomerDetail`
- `QuotationForm`
- `ProductPicker`
- `QuotationDetail`
- `OrderDetail`
- `PaymentForm`

`mobile/src/screens/ListScreen.js` will remain generic. It will receive route behavior from `listServices` or a small route map, so only supported list resources become pressable:

- `customers` -> `CustomerDetail`
- `quotations` -> `QuotationDetail`
- `orders` -> `OrderDetail`

`mobile/src/components/ListCard.js` will accept an optional `onPress` prop and render as pressable only when navigation is available.

## API Layer

`mobile/src/api/services.js` will keep the existing list mapping API and add focused service objects:

- `customerService.getById(customerId)` -> `GET /customers/{id}`
- `customerService.getQuotations(customerId)` -> `GET /quotations/customer/{customerId}`
- `customerService.getOrders(customerId)` -> `GET /orders/customer/{customerId}`
- `productService.getProducts(params)` -> `GET /products`
- `productService.searchProducts(query)` -> `GET /products/search`
- `quotationService.getById(quotationId)` -> `GET /quotations/{id}`
- `quotationService.create(payload)` -> `POST /quotations`
- `orderService.getById(orderId)` -> `GET /orders/{id}`
- `orderService.createFromQuotation(quotationId)` -> `POST /orders/from-quotation/{quotationId}`
- `paymentService.getByOrder(orderId)` -> `GET /payments/order/{orderId}`
- `paymentService.create(payload)` -> `POST /payments`

All methods will reuse the existing axios client so JWT headers, base URL, and error formatting stay consistent.

## Screens

### CustomerDetail

Fetches customer data, recent quotations, and recent orders in parallel. Shows identity/contact fields, address/city/type/status, and two compact recent lists. Actions:

- Create quotation with the selected customer preloaded.
- Open quotation detail.
- Open order detail.

### QuotationForm

Starts from customer detail with `customerId` and customer name. Allows product selection through `ProductPicker`, local line-item editing, quantity/price/discount changes, item removal, and running totals. Defaults:

- `quotationDate`: today.
- `validUntil`: seven days from today.
- `taxPercentage`: 18.
- `discount`: 0.
- `termsAndConditions`: short default copied from the web workflow.

On submit it validates at least one line item, sends the backend quotation DTO shape, preserves values on API failure, and navigates to `QuotationDetail` on success.

### ProductPicker

Searches products through the real product API and returns the selected product to `QuotationForm`. The selected product populates `productId`, `productName`, `productSku`, and `unitPrice` from `sellingPrice`.

### QuotationDetail

Fetches quotation detail by id and shows customer, quotation number, date, expiry, status, line items, subtotal, tax, discount, and total. If the quotation is not converted, it shows a `Convert To Order` action.

Conversion shows a confirmation dialog, disables the button while submitting, calls `POST /orders/from-quotation/{quotationId}`, and navigates to `OrderDetail` with the created order id.

### OrderDetail

Fetches order detail and related payments. Shows order number, customer, dates/statuses, line items, subtotal, total, paid amount, balance amount, and payment history. Actions:

- Record payment.
- Refresh order and payments.

### PaymentForm

Starts from `OrderDetail` with the order id and balance amount. It captures amount, payment method, payment date, reference number, and notes. It validates amount locally, preserves values after failed submit, shows API validation errors at the top, submits to `POST /payments`, then returns to `OrderDetail` with a refresh flag.

## Reusable Components

Add small reusable components only where they reduce duplication:

- `DetailSection` for grouped detail panels.
- `FieldRow` for label/value rows.
- `PrimaryActionBar` for sticky or bottom actions.
- `AppTextInput` for consistent mobile form inputs.
- `AppSelect` for payment method selection.
- `FormErrorBanner` for validation/API errors.

Line-item editing can start inside `QuotationForm` to avoid over-abstracting. If it grows too large, move it into `LineItemEditor`.

## Calculation Helpers

Add pure helpers in `mobile/src/utils/quotationTotals.js`:

- `calculateLineTotal(item)`
- `calculateQuotationTotals(items, taxPercentage, discount)`
- `buildQuotationPayload(formState)`

Add `mobile/src/utils/paymentTotals.js` if payment amount validation becomes shared.

Helpers must be deterministic and not call APIs.

## Error Handling

Existing loading, empty, error, and refresh states stay intact. New screens will use the same `LoadingView`, `ErrorView`, and `EmptyView` components.

Forms will show clear error banners, disable submit buttons while saving, and keep all entered values after backend validation failures. Quotation conversion and payment submit will show visible failure messages instead of silently navigating.

## Testing And Verification

The mobile app currently exposes `npm run lint` and `npm run ui:smoke`. There is no `npm test` script in `mobile/package.json`, so unit tests are a known tooling gap unless a test runner is added separately.

Verification target:

1. Run `npm run lint` in `mobile/`.
2. Run `npm run ui:smoke` if the environment can execute it.
3. Manually smoke the QA flow against a running backend:
   Login -> Customers -> Customer Detail -> Create Quotation -> Product Picker -> Save -> Quotation Detail -> Convert -> Order Detail -> Record Payment -> Order Detail Updated.

## Known Constraints

The backend still uses roles `ADMIN`, `MANAGER`, and `SALES` instead of the required `ADMIN`, `STORE_MANAGER`, and `STAFF`. This phase will not add new roles or fake client-side role mappings. If backend authentication blocks a `STAFF` user during testing, the blocker is backend role alignment, not the mobile workflow.

The customer detail screen depends on existing quotation/order customer endpoints. If a customer has no recent quotations or orders, the screen will show empty states and still allow quotation creation.

## Success Criteria

Phase 1 is complete when a logged-in sales user can complete the full customer-to-payment mobile flow using real backend APIs, without mock data and without using the web app for quotation creation, quotation conversion, order review, or payment recording.
