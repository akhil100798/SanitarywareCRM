# Phase 11 — Enterprise Roadmap Expansion Features

This runbook documents the architecture, endpoints, data contracts, and verification procedures for the three enterprise roadmap expansion features implemented in Phase 11:

1. **WhatsApp & SMS Business Integration** (Twilio)
2. **Customer / Distributor Self-Service Portal** (Tokenized Sharing)
3. **Advanced Inventory Analytics & Predictive Reordering**

---

## 1. Feature 1: WhatsApp Business Integration (Twilio)

### Architecture
- **Service Layer**: `WhatsAppService` & `WhatsAppServiceImpl` (`com.sanitaryware.crm.service`).
- **Twilio Integration**: Uses official `com.twilio.sdk:twilio:9.14.1` SDK with dynamic initialization.
- **Fail-Safe Sandbox Simulation**: When `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN` is blank or contains default placeholders, the backend does **not** fail or throw 500. Instead, it enters **Sandbox Simulation Mode**, generating a unique `SIM-XXXXXXXX` tracking ID and logging the dispatch while returning HTTP 200 with `status: "SIMULATED"`.
- **Phone Number Normalization**: Automatically strips punctuation/spaces and prepends `+91` for standard 10-digit mobile numbers or formats international numbers according to E.164.
- **Audit Logging**: Every quotation dispatch and payment receipt dispatch is recorded in `AuditService`.

### Endpoints
| HTTP Verb | Path | Auth / Role | Description |
|-----------|------|-------------|-------------|
| `POST` | `/api/quotations/{id}/send-whatsapp` | `ADMIN`, `MANAGER`, `SALES` | Dispatches quotation summary with customer self-service link |
| `POST` | `/api/payments/{id}/send-whatsapp` | `ADMIN`, `MANAGER`, `SALES` | Dispatches formal payment receipt with order balance |

### Sample Request & Response
```json
// POST /api/quotations/101/send-whatsapp
{
  "phoneNumber": "+919876543210"
}

// HTTP 200 OK
{
  "status": "SENT",
  "messageId": "SMa1b2c3d4e5f6...",
  "recipient": "+919876543210",
  "message": "Hello Acme Sanitary,\n\nHere is your quotation QT-202611-0001...",
  "timestamp": "2026-11-16T13:00:00",
  "detail": "Message dispatched successfully via Twilio WhatsApp API"
}
```

---

## 2. Feature 2: Customer / Distributor Self-Service Portal

### Architecture
- **Schema Migration**: `V12__Add_Quotation_Share_Token.sql` adds `share_token VARCHAR(64) UNIQUE` to table `quotations`.
- **Token Generation**: On creation or first access, a cryptographically random UUID token is generated (`UUID.randomUUID().toString()`).
- **Security Boundary**: Permitted through `SecurityConfig` (`/api/portal/**`) without requiring CRM credentials or session tokens.
- **Public Portal UI**: `CustomerPortalPage.jsx` provides a customer-facing responsive interface displaying quotation header, customer information, line item table with unit prices and totals, tax calculation, PDF download button, and a one-click "Accept Quotation" action.

### Endpoints
| HTTP Verb | Path | Security | Description |
|-----------|------|----------|-------------|
| `GET` | `/api/portal/quotations/{token}` | Public / Token | Returns public quotation details and line items |
| `GET` | `/api/portal/quotations/{token}/pdf` | Public / Token | Streams generated PDF invoice/quotation |
| `POST` | `/api/portal/quotations/{token}/accept` | Public / Token | Customer accepts quotation; updates status to `ACCEPTED` |

---

## 3. Feature 3: Advanced Inventory Analytics & Predictive Reordering

### Architecture
- **Data Model**: `InventoryAnalyticsDTO` containing `LowStockAlertDTO`, `ReorderSuggestionDTO`, and `InventoryHealthSummaryDTO`.
- **Velocity Engine**: Queries `order_items` over a 30-day window (`LocalDate.now().minusDays(30)`) excluding cancelled orders:
  $$\text{Daily Sales Velocity} = \frac{\sum \text{Quantity Sold in 30 Days}}{30}$$
- **Days Until Depletion**:
  $$\text{Days Remaining} = \left\lfloor \frac{\text{Current Stock}}{\text{Daily Velocity}} \right\rfloor$$
- **Reorder Recommendation Algorithm**:
  - Triggers if $\text{Current Stock} \le \text{Reorder Level}$ OR $\text{Days Remaining} \le 14$.
  - Target coverage: 28–30 days of sales with safety buffer:
    $$\text{Suggested Qty} = \max\left(5, 2 \times \text{Reorder Level} - \text{Current Stock}, \lceil \text{Daily Velocity} \times 30 \rceil\right)$$
- **Supplier Auto-Discovery**: Cross-references `PurchaseOrderItem` history to identify the last distributor who supplied the SKU.

### Endpoints
| HTTP Verb | Path | Auth / Role | Description |
|-----------|------|-------------|-------------|
| `GET` | `/api/inventory-analytics/alerts` | `ADMIN`, `MANAGER`, `WAREHOUSE` | Products with urgent low or depleted stock |
| `GET` | `/api/inventory-analytics/reorder-suggestions` | `ADMIN`, `MANAGER`, `WAREHOUSE` | Velocity-based reorder quantities & costs |
| `GET` | `/api/inventory-analytics/summary` | `ADMIN`, `MANAGER`, `WAREHOUSE` | Consolidated inventory KPIs and budget forecast |

---

## 4. Verification & Testing

- **Backend Tests**: 313 unit and integration tests passing (`mvn test`).
- **Mobile Tests**: 22 unit tests passing (`npm test` in `mobile/`).
- **Frontend Build**: Clean Vite production bundle (`npm run build` in `frontend/`).
- **E2E Automation**: Automated API checks for WhatsApp dispatch (`EXP-001`), Customer Portal access (`EXP-002`), and Inventory Analytics (`EXP-003`, `EXP-004`, `EXP-005`).
