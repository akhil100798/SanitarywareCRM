# Product Specification Document: Sanitaryware CRM

## 1. Overview
The **Sanitaryware CRM** is a specialized management system designed for retail and wholesale businesses in the sanitaryware industry. It streamlines the lifecycle of sales from initial customer inquiry (Quotation) through order fulfillment and payment tracking.

## 2. Core Features

### 2.1 Foundation Management
- **Customer Directory**: Management of retail and wholesale customers with contact details and billing info.
- **Product Catalog**: Organized inventory by Category and Brand, including SKU tracking and automated stock management.
- **Role-Based Access**: Secure login and permission levels for Administrators and Sales Staff.

### 2.2 Sales Lifecycle (Core Business)
- **Quotations**: Dynamic quote generation with:
    - Multi-item support.
    - Automatic GST/Tax and Discount calculations.
    - Expiry tracking and status management (Sent, Accepted, Rejected).
- **Orders**: Conversion of quotes to orders or direct order creation.
- **Stock Automation**: Real-time deduction of stock levels upon order confirmation and restoration upon cancellation.

### 2.3 Financials & Operations
- **Payment Tracking**: Record partial and full payments against specific orders using various methods (Cash, UPI, Bank Transfer).
- **Balance Monitoring**: Automatic calculation of pending dues per order.
- **Executive Dashboard**: High-level business overview featuring:
    - Revenue metrics.
    - Order volume and pending tasks.
    - Low stock alerts (< 10 units).
    - Recent sales activity.

## 3. Technical Architecture

### 3.1 Backend (Spring Boot)
- **Language**: Java 17+
- **Persistence**: Spring Data JPA with Hibernate.
- **Database**: MySQL.
- **Security**: Spring Security with JWT (JSON Web Token) for stateless authentication.
- **Mapping**: Custom static Mappers for DTO-Entity conversion to maintain clean separation of layers.

### 3.2 Frontend (React)
- **Framework**: Vite + React.
- **Styling**: TailwindCSS for a premium, responsive UI.
- **State Management**: React Hooks (useState, useEffect).
- **Icons**: Lucide-React.
- **Feedback**: React Hot Toast for real-time notifications.

### 3.3 Database Schema (Key Entities)
- `users`: Authentication and staff records.
- `customers`: Customer profiles.
- `products`: Inventory items with brand/category links.
- `quotations`: Sales proposals and itemized lists.
- `orders`: Confirmed sales and delivery tracking.
- `payments`: Receipt records linked to orders.

## 4. Key Design Decisions
- **Modularity**: Separation of concerns between Services, Controllers, and Mappers.
- **Immutability**: Use of DTOs for external communication to protect internal entity logic.
- **UX Focus**: Clean, dashboard-driven interface with quick-action shortcuts to minimize navigation clicks.

## 5. Future Roadmap
- **Phase 4: Document Generation**: Automated PDF generation for Quotations and Invoices.
- **Phase 5: Advanced Analytics**: Monthly sales trends, customer lifetime value reports, and category-wise performance.
- **Phase 6: Multi-Warehouse**: Support for stock tracking across different storage locations.
