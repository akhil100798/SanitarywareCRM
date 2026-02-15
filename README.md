# Sanitaryware CRM System

Enterprise-level Customer Relationship Management system built specifically for sanitaryware retail businesses.

## Technology Stack

### Backend
- **Framework**: Java Spring Boot 3.2.2
- **Database**: MySQL 8.0+
- **Authentication**: JWT (JSON Web Tokens)
- **ORM**: Spring Data JPA with Hibernate
- **Build Tool**: Maven

### Frontend
- **Framework**: React 18 with Vite
- **Language**: JavaScript/TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **UI Components**: Shadcn/ui

## Features

- ✅ **User Management**: Role-based access control (Admin, Manager, Sales, Warehouse)
- ✅ **Customer Management**: Complete customer profiles with purchase history
- ✅ **Product Catalog**: Brand tracking, hierarchical categories, inventory management
- ✅ **Quotation System**: Create, send, and convert quotations to orders
- ✅ **Order Management**: Full order lifecycle tracking from creation to delivery
- ✅ **Payment Tracking**: Multiple payment methods with balance calculation
- ✅ **Inventory Management**: Stock tracking with low stock alerts
- 🚧 **Reports & Analytics**: Sales, customer, and inventory analytics
- 🚧 **Notifications**: WhatsApp and Email integration

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- MySQL 8.0+
- Node.js 18+ and npm
- Git

## Setup Instructions

### Database Setup

1. Install MySQL and create the database:
```sql
CREATE DATABASE sanitaryware_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Update database credentials in `backend/src/main/resources/application.properties`:
```properties
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Build the project:
```bash
mvn clean install
```

3. Run the application:
```bash
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

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

### JWT Secret
**Important**: Change the JWT secret in production:
```properties
jwt.secret=your-secure-256-bit-secret-key
```

## License

Proprietary - All Rights Reserved

## Support

For support and questions, please contact your system administrator.
