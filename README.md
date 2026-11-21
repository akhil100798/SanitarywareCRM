# Sanitaryware CRM System

Enterprise-level Customer Relationship Management system built specifically for sanitaryware retail businesses.

## Project Preview

| Dashboard | Products |
|-----------|----------|
| ![Dashboard](screenshots/dashboard.png) | ![Products](screenshots/products.png) |

| Orders | Quotations |
|--------|------------|
| ![Orders](screenshots/orders.png) | ![Quotations](screenshots/quotations.png) |

## Technology Stack

### Backend
- **Framework**: Java Spring Boot 3.2.2
- **Database**: MySQL 8.0+
- **Authentication**: JWT (JSON Web Tokens)
- **ORM**: Spring Data JPA with Hibernate
- **Build Tool**: Maven

### Frontend
- **Framework**: React 18 with Vite
- **Language**: JavaScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **UI Components**: TailwindCSS components and Lucide icons

### Mobile
- **Framework**: React Native 0.88 with Expo SDK 58
- **Navigation**: React Navigation
- **Authentication Storage**: SecureStore (native) / sessionStorage (web) for JWT session
- **API Client**: Axios against the same Spring Boot REST API

## Features

- ✅ **User Management**: Role-based access control (Admin, Manager, Sales, Warehouse)
- ✅ **Customer Management**: Complete customer profiles with purchase history
- ✅ **Product Catalog**: Brand tracking, hierarchical categories, inventory management
- ✅ **Quotation System**: Create, send, and convert quotations to orders
- ✅ **Order Management**: Full order lifecycle tracking from creation to delivery
- ✅ **Payment Tracking**: Multiple payment methods with balance calculation
- ✅ **Inventory Management**: Stock tracking with low stock alerts
- ✅ **Reports & Analytics**: Sales, customer receivables aging buckets (0-30, 31-60, 61-90, 90+ days), dead-stock SKU analysis, brand gross margins, and GSTR-1/3B tax compliance exports (CSV/Excel)
- ✅ **Notifications**: Automated payment-due reminders and low-stock alerts with Twilio WhatsApp and Spring Mail dispatches, persistent audit logs (`notification_dispatch_logs`), and retry controls

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- MySQL 8.0+
- Node.js 20.19+ and npm
- Git

## Setup Instructions

### Database Setup

1. Install MySQL and create the database:
```sql
CREATE DATABASE sanitaryware_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Set `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD` in your environment. Use `backend/.env.example` as a reference; do not put real credentials in source files.

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Build the project:
```bash
mvn clean install
```

3. Run the application against your configured MySQL database:
```bash
mvn spring-boot:run
```

The backend will start on `http://localhost:8081`

For local QA without MySQL credentials, run the in-memory H2 profile:
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=qa
```

The QA profile uses a disposable in-memory H2 database and creates development test users. Use it for local and automated tests. The `dev` profile also uses H2; neither profile is for production.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### Mobile Android Setup

The mobile app lives in `mobile/` and reuses the existing Spring Boot API.
It is scaffolded on Expo SDK 58, which targets React Native 0.88 and requires Node.js 20.19.x or newer.

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Copy the mobile environment file and set the API URL:
```bash
copy .env.example .env
```

For Android Emulator, use:
```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8081/api
```

For a real Android phone on the same Wi-Fi, replace the host with your computer LAN IP:
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8081/api
```

For production, use your deployed HTTPS backend URL.

4. Start Expo:
```bash
npm start
```

5. Run Android:
```bash
npm run android
```

## Default User Credentials

After first run, create an admin user via the `/api/auth/register` endpoint:

```json
{
  "username": "admin",
  "email": "admin@sanitaryware.com",
  "password": "Admin@123",
  "fullName": "System Administrator",
  "phoneNumber": "1234567890",
  "role": "ADMIN"
}
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Customer Endpoints

- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `GET /api/customers/{id}` - Get customer details
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Delete customer

### Product Endpoints

- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/{id}` - Get product details
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Order Endpoints

- `GET /api/orders` - List all orders
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order details
- `PUT /api/orders/{id}` - Update order

### Quotation Endpoints

- `GET /api/quotations` - List all quotations
- `POST /api/quotations` - Create quotation
- `GET /api/quotations/{id}` - Get quotation
- `PUT /api/quotations/{id}` - Update quotation
- `POST /api/quotations/{id}/convert` - Convert to order

### Reports & Analytics Endpoints

- `GET /api/reports/sales-summary` - Aggregate sales and revenue metrics
- `GET /api/reports/gst-summary` - GSTR-1 / GSTR-3B tax metrics with HSN code breakdown
- `GET /api/reports/gst-summary/export` - Export GST summary as CSV or Excel (.xlsx)
- `GET /api/reports/payment-aging` - Customer receivables aging buckets (0-30, 31-60, 61-90, 90+ days)
- `GET /api/reports/payment-aging/export` - Export payment aging as CSV or Excel (.xlsx)
- `GET /api/reports/dead-stock` - Dormant SKUs and tied-up working capital analysis
- `GET /api/reports/brand-margins` - Brand-wise sales, COGS, gross margin, and profitability %
- `GET /api/reports/inventory-summary` - Inventory valuation and stock status

### Automated Notification Endpoints

- `GET /api/notifications/logs` - Paginated notification dispatch audit logs (channel, recipient, status, attempts)
- `POST /api/notifications/retry/{id}` - Re-trigger manual dispatch for a failed/simulated notification
- `POST /api/notifications/trigger/low-stock` - Manually trigger low-stock threshold inspection and alerts
- `POST /api/notifications/trigger/payment-due` - Manually trigger payment-due reminder dispatches

## Project Structure

```
SanitarywareCRM/
├── backend/
│   ├── src/main/java/com/sanitaryware/crm/
│   │   ├── config/          # Configuration classes
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── entity/          # JPA entities
│   │   ├── repository/      # Data repositories
│   │   ├── security/        # Security & JWT
│   │   └── service/         # Business logic
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── store/           # State management
│   │   └── utils/           # Utility functions
│   └── package.json
└── README.md
```

## Configuration

### Email Configuration (Gmail)
Update in `application.properties`:
```properties
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
```

### WhatsApp Configuration (Twilio)
Update in `application.properties`:
```properties
twilio.account.sid=your-twilio-sid
twilio.auth.token=your-twilio-token
twilio.whatsapp.number=whatsapp:+14155238886
```

### Scheduled Automations
Automated reminder and low-stock cron jobs are managed by `NotificationScheduledTasks` and gated by:
```properties
notifications.scheduler.enabled=true
```
Set to `false` in development/QA to disable background execution during automated testing.

### JWT Secret
**Important**: Production requires `JWT_SECRET` to be provided as an environment variable. It must be at least 32 characters.

## Production Readiness

- Copy `backend/.env.example` and `frontend/.env.example` into your deployment environment and set real values there. Do not commit production secrets.
- The default backend profile uses `spring.jpa.hibernate.ddl-auto=validate`; manage schema changes with migrations or controlled SQL scripts.
- Public self-registration is disabled after the first bootstrap user. The first registered user becomes `ADMIN`; later registrations require an authenticated `ADMIN` or `MANAGER` and create `SALES` users.
- Set `CORS_ALLOWED_ORIGIN_PATTERNS` to the exact production frontend origin.
- Build checks:
```bash
cd backend && mvn test
cd frontend && npm run build
```

## Load & Performance Testing (k6)

Sanitaryware CRM includes a repeatable load and stress testing script (`scripts/load-test/crm-smoke-load.js`) measuring API throughput, p95 latency (< 250ms), zero 5xx server errors, and rate-limiting resilience under 50 RPS bursts.

### Prerequisites
Install [k6](https://k6.io/docs/get-started/installation/):
```bash
# Windows
winget install k6 --source winget

# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo apt-get install k6
```

### Running against Local QA Backend (`http://localhost:8081`)
```bash
k6 run scripts/load-test/crm-smoke-load.js
```

### Running against Staging or Custom Host
```bash
k6 run -e BASE_URL="https://staging.crm.example.com" -e ADMIN_USER="admin" -e ADMIN_PASSWORD="your-staging-password" scripts/load-test/crm-smoke-load.js
```

## License

Proprietary - All Rights Reserved

## Support

For support and questions, please contact your system administrator.
