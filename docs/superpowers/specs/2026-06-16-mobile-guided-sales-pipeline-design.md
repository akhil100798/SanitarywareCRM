# Mobile Guided Sales Pipeline Design

Date: 2026-06-16

## Goal

Build the first mobile development phase around the field-sales workflow from the web app:

Customer list -> Customer detail -> Create quotation -> Convert quotation to order -> Order detail -> Record payment.

The mobile app should become useful for sales staff visiting or calling customers. It should not try to replicate every web admin screen in this phase.

## Current State

The mobile app already has:

- Login/logout with stored JWT session.
- Dashboard summary.
- List screens for customers, products, orders, quotations, payments, distributors, purchase orders, distributor payments, brands, categories, and settings.
- Search for customers and products.
- Basic loading, empty, error, and pull-to-refresh states.

The web app has full create/edit workflows for sales modules. Mobile currently lacks detail screens, write workflows, line-item editing, and conversion/payment actions.

## Phase 1 Scope

### Customer Detail

Add a customer detail screen opened from the mobile customer list. It should show:

- Customer name, company, phone, email, address/city, type, and active status.
- Recent quotations for that customer.
- Recent orders for that customer.
- Clear actions for creating a quotation and viewing related records.

### Quotation Create And Detail

Add a mobile quotation workflow:

- Create quotation from a customer detail screen.
- Select products through a searchable product picker.
- Add, edit, and remove line items.
- Capture quantity, unit price, and discount fields that exist in the current quotation DTO.
- Show running subtotal/total values.
- Submit to the existing quotation API.
- Open a quotation detail screen after save.

Quotation detail should show customer, dates/status, line items, totals, and an action to convert to order.

### Convert Quotation To Order

Use the existing backend order conversion endpoint exposed in the web service layer:

- `POST /orders/from-quotation/{quotationId}`

The mobile UI should confirm conversion, submit the request, and navigate to the created order detail when successful.

### Order Detail

Add an order detail screen opened from order lists or conversion results. It should show:

- Order number, customer, order date, status, and payment status.
- Line items and totals.
- Payment summary based on the order totals and any payments returned by the payment API.
- Actions to record payment and refresh the order.

Order creation from scratch is out of scope for this phase.

### Payment Create

Add a payment form launched from order detail:

- Preselect the order.
- Capture amount, payment method, payment date, reference number, and notes fields that exist in the current payment DTO.
- Submit to the existing payment API.
- Navigate back to order detail and refresh after success.

## Out Of Scope For Phase 1

- Distributor, purchase order, and distributor payment write workflows.
- Product create/edit and image upload.
- Customer create/edit.
- Bulk catalog upload.
- Offline drafts.
- Push notifications.
- Full admin/settings/profile parity.

## Architecture

### Navigation

Extend the existing React Navigation structure:

- Keep current bottom tabs.
- Add stack screens for:
  - `CustomerDetail`
  - `QuotationDetail`
  - `QuotationForm`
  - `OrderDetail`
  - `PaymentForm`
  - `ProductPicker`

List cards should become pressable and navigate to the matching detail screen when a detail route exists.

### API Layer

Extend `mobile/src/api/services.js` with module service methods matching the web app:

- Customers: `getById`, `getQuotations`, `getOrders` using existing customer-related endpoints.
- Products: search/list for picker.
- Quotations: `getById`, `create`, and status reads from quotation detail responses.
- Orders: `getById`, `createFromQuotation`, status/payment-status reads.
- Payments: `create`, `getByOrder`.

Keep the current list mapping API for existing list screens.

### Components

Introduce reusable mobile components:

- `DetailSection` for titled groups of fields.
- `FieldRow` for label/value display.
- `PrimaryActionBar` for important screen actions.
- `AppTextInput`, `AppSelect`, and form error helpers if the existing code has no equivalents.
- `ProductPicker` for product search and selection.
- `LineItemEditor` for quotation items.

The shared components should be module-neutral. Module-specific logic belongs in the screen that owns the workflow.

### Data Flow

1. Customer list fetches list data as it does today.
2. Tapping a customer fetches full customer detail plus customer quotations and orders.
3. Creating a quotation passes the selected customer into the quotation form.
4. The quotation form fetches products through the picker, builds line items locally, then submits.
5. Quotation detail converts to order through the backend.
6. Order detail fetches order data and related payments.
7. Payment form submits, then order detail refreshes.

## Error Handling

- Preserve existing loading, empty, and error views.
- Show API validation errors at the top of the form and preserve user-entered form values after failure.
- Disable submit buttons while requests are in flight.
- Show clear failure messages for conversion and payment submit.
- Avoid silent failures after navigation; refresh destination screens after mutating actions.

## Testing And Verification

Minimum verification for the implementation:

- Mobile lint over app source.
- Manual smoke flow against the QA backend:
  - Login.
  - Open customer list.
  - Open customer detail.
  - Create quotation with at least one product line.
  - Convert quotation to order.
  - Open order detail.
  - Record payment.
- Add focused tests for pure helpers such as total calculation and DTO assembly if the mobile test tooling is already available after dependency install. If no mobile test runner is configured, verify those helpers through the manual smoke flow and document the gap.

## Success Criteria

Phase 1 is complete when a sales user can complete a quotation-to-payment flow on mobile without using the web app, assuming required customers and products already exist.
