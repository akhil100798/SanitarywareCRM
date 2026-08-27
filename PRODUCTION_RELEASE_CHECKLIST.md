# SanitarywareCRM — Production Release Checklist

This document details the complete operational checklist for promoting SanitarywareCRM to a live production environment.

---

## 1. Pre-Deployment Configuration & Secrets Checklist

| Variable Name | Description | Environment | Sensitive? | Production Validation Rule |
| :--- | :--- | :---: | :---: | :--- |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | Backend | No | Must be set to `prod` |
| `SERVER_PORT` | HTTP Server port | Backend | No | Default `8081` |
| `DATABASE_URL` | JDBC connection string | Backend | Yes | Must target managed MySQL/PostgreSQL RDS/CloudSQL with SSL |
| `DATABASE_USERNAME` | Database username | Backend | Yes | Dedicated non-root user with least privilege |
| `DATABASE_PASSWORD` | Database password | Backend | Yes | Strong entropy (>= 24 chars) |
| `JWT_SECRET` | Secret HMAC-SHA256 key | Backend | Yes | Minimum 256 bits (32+ alphanumeric random characters) |
| `JWT_EXPIRATION_MS` | JWT token validity window | Backend | No | Default `86400000` (24 hours) |
| `CORS_ALLOWED_ORIGIN_PATTERNS` | Allowed Frontend Origins | Backend | No | Exact HTTPS production frontend URL (e.g. `https://crm.example.com`) |
| `FILE_UPLOAD_DIR` | Upload storage directory | Backend | No | Mounted persistent volume or path (e.g. `/var/lib/sanitaryware-crm/uploads`) |
| `MAIL_USERNAME` | SMTP mail sender | Backend | Yes | Valid SMTP auth user |
| `MAIL_PASSWORD` | SMTP mail password / App password | Backend | Yes | Valid SMTP auth secret |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Backend | Yes | Optional WhatsApp integration |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Backend | Yes | Optional WhatsApp integration |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp Sender | Backend | No | Optional WhatsApp integration |
| `VITE_API_BASE_URL` | Frontend API Base URL | Frontend | No | Production backend API endpoint (e.g. `https://api.crm.example.com/api`) |

> [!CAUTION]
> Never commit actual secrets or `.env` files with credentials to Git. Inject them securely via Docker environment variables, Kubernetes Secrets, AWS Secrets Manager, or PaaS configuration dashboards (Render/Vercel/Railway).

---

## 2. Database Setup & Migration Procedure

- [ ] **Provision Managed Database**: PostgreSQL or MySQL 8.0+ instance with automated backups and read-replica / failover enabled.
- [ ] **Flyway Migration Execution**:
  - `V1__Initial_Schema.sql`
  - `V2__Normalize_And_Unique_Customer_Phone.sql`
  - `V3__Add_Product_Catalogue_Tax_And_Barcode_Fields.sql`
  - `V4__Add_Product_Catalogue_Search_Indexes.sql`
  - `V5__Add_Purchase_Order_Item_Tax_And_Barcode_Fields.sql`
  - `V6__Add_Sales_Item_Tax_Snapshots.sql`
  - `V7__Add_Audit_Logs_Table.sql`
- [ ] **Schema Validation**: Ensure `spring.jpa.hibernate.ddl-auto=validate` so Hibernate verifies schema without executing unmanaged DDL mutations.
- [ ] **Initial Admin User Creation**: Run initial SQL seed or call the one-time registration endpoint over HTTPS to bootstrap the production administrator account.

---

## 3. Backend Deployment Checklist

- [ ] Build standalone production executable JAR: `mvn clean package -DskipTests` (tests pre-verified in CI).
- [ ] Ensure non-root container user execution (`crm:crm`).
- [ ] Configure health check probe against `/api/health`.
- [ ] Set JVM memory flags (e.g. `-XX:+UseG1GC -XX:MaxRAMPercentage=75.0`).
- [ ] Verify CORS headers allow only the authorized production frontend origins.
- [ ] Ensure `DevQaUserInitializer` is inactive (guaranteed by `@Profile({"dev", "qa"})`).

---

## 4. Frontend Deployment Checklist

- [ ] Build production assets: `npm ci && npm run build`.
- [ ] Set `VITE_API_BASE_URL` pointing to the public HTTPS backend URL.
- [ ] Configure Nginx / Vercel SPA routing rewrites (`/*` -> `/index.html`).
- [ ] Enable Gzip / Brotli compression for static `.js`, `.css`, and `.svg` files.
- [ ] Verify asset caching headers (`Cache-Control: public, max-age=31536000, immutable` for hashed assets).

---

## 5. Security & Invariant Release Checklist

- [ ] **RBAC Verification**:
  - `ADMIN`: Full system, settings, user, audit, and inventory control.
  - `MANAGER`: Product, order, quotation, and report operations without system settings mutations.
  - `SALES`: Restricted to quotation/order creation and catalog browsing without mutation or financial report access.
- [ ] **Financial Invariant Check**:
  $$\text{paidAmount} + \text{balanceAmount} = \text{totalAmount}$$
- [ ] **Inventory Invariant Check**:
  $$\text{Stock} = \text{Initial} + \text{Received POs} - \text{Confirmed Orders} + \text{Cancelled Confirmed} \pm \text{Stock Adjustments}$$
- [ ] **Audit Trail**: Full mutation logging on customers, distributors, products, quotations, orders, POs, payments, and settings.
- [ ] **Sanitized Errors**: No stack traces or internal paths exposed in API error responses.

---

## 6. Backup, Rollback & Disaster Recovery Checklist

- [ ] Automated daily database snapshots configured with 30-day retention.
- [ ] Point-In-Time Recovery (PITR) enabled on production database.
- [ ] Offsite backup replication for uploaded assets in `FILE_UPLOAD_DIR`.
- [ ] Tested rollback procedure for previous container image tag.

---

## 7. Post-Deployment Smoke Test Protocol

1. Perform Health Check: `GET /api/health` returns `{"status":"UP"}`.
2. Authenticate as Production Admin via HTTPS.
3. Verify Dashboard metrics load with 200 OK.
4. Verify Product Catalog search and filter.
5. Create a test Quotation, convert to Order, Confirm Order (verify stock deduction).
6. Record Payment (verify balance reduction and ledger consistency).
7. Download Tax Invoice PDF (verify bytes returned).
8. Inspect Audit Logs to confirm all actions recorded with actor username and timestamp.
