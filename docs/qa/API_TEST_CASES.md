# API TEST CASE MATRIX

This document outlines the testing parameters, inputs, and database behaviors for the REST API endpoints in the Sanitaryware CRM.

---

## 1. Authentication Endpoints

### Method: `POST` | Endpoint: `/api/auth/register`
* **Scenario**: Create a new administrator account.
* **Auth Required**: None (Initial registration is public).
* **Request Body**:
  ```json
  {
    "fullName": "Akhil Sirupuram",
    "username": "akhil",
    "email": "akhilsirupuram16@gmail.com",
    "phoneNumber": "9440075232",
    "password": "SecurePassword123"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**: Profile JSON containing ID and default role (`SALES` or `ADMIN`).
* **Database Impact**: Adds one record to `users` table.

### Method: `POST` | Endpoint: `/api/auth/login`
* **Scenario**: Successful login with credentials.
* **Auth Required**: None.
* **Request Body**:
  ```json
  {
    "username": "akhil",
    "password": "SecurePassword123"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**: JSON containing `"accessToken"` string and user details.
* **Database Impact**: None (updates `last_login` timestamp).

---

## 2. Category Management Endpoints

### Method: `POST` | Endpoint: `/api/categories`
* **Scenario**: Create a root product category.
* **Auth Required**: `ADMIN` or `MANAGER`.
* **Request Body**:
  ```json
  {
    "name": "Ceramics",
    "description": "Premium vitreous china sanitaryware products"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**: Created Category DTO including ID.
* **Database Impact**: Inserts row in `categories` table.

### Method: `GET` | Endpoint: `/api/categories`
* **Scenario**: List all active categories.
* **Auth Required**: `ADMIN`, `MANAGER`, or `SALES`.
* **Request Body**: None.
* **Expected Status**: `200 OK`
* **Expected Response**: Array of Category DTO objects.
* **Database Impact**: None.

---

## 3. Product Catalog Endpoints

### Method: `POST` | Endpoint: `/api/products`
* **Scenario**: Register a new product item.
* **Auth Required**: `ADMIN` or `MANAGER`.
* **Request Body**:
  ```json
  {
    "sku": "CER-BAS-001",
    "name": "Vitreous China Wash Basin",
    "description": "Pedestal mounted bathroom basin",
    "categoryId": 1,
    "brandId": 1,
    "mrp": 3500.00,
    "sellingPrice": 2999.00,
    "stockQuantity": 50,
    "reorderLevel": 5
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**: Created Product DTO with generated ID.
* **Database Impact**: Inserts row in `products` table.

---

## 4. Sales & Quotations Endpoints

### Method: `POST` | Endpoint: `/api/quotations`
* **Scenario**: Create a quotation draft for customer.
* **Auth Required**: `ADMIN`, `MANAGER`, or `SALES`.
* **Request Body**:
  ```json
  {
    "customerId": 1,
    "validUntil": "2026-07-30",
    "items": [
      {
        "productId": 1,
        "quantity": 10,
        "unitPrice": 2999.00
      }
    ]
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**: Created Quotation DTO with calculated subtotals, tax, and discount fields.
* **Database Impact**: Inserts rows in `quotations` and `quotation_items` tables.

### Method: `GET` | Endpoint: `/api/quotations/{id}/pdf`
* **Scenario**: Stream quotation as PDF download.
* **Auth Required**: `ADMIN`, `MANAGER`, or `SALES`.
* **Request Body**: None.
* **Expected Status**: `200 OK`
* **Expected Response**: PDF binary stream (Header: `Content-Type: application/pdf`).
* **Database Impact**: None.

---

## 5. Orders & Payments Endpoints

### Method: `POST` | Endpoint: `/api/orders/from-quotation/{id}`
* **Scenario**: Convert quotation into an active customer order.
* **Auth Required**: `ADMIN`, `MANAGER`, or `SALES`.
* **Request Body**: None.
* **Expected Status**: `200 OK`
* **Expected Response**: Created Order DTO with reference to quotation ID.
* **Database Impact**: 
  * Inserts rows in `orders` and `order_items`.
  * Decrements `stock_quantity` inside `products` table.
  * Updates quotation status to `CONVERTED`.

### Method: `POST` | Endpoint: `/api/payments`
* **Scenario**: Record payment details against outstanding balance.
* **Auth Required**: `ADMIN`, `MANAGER`, or `SALES`.
* **Request Body**:
  ```json
  {
    "orderId": 1,
    "amount": 15000.00,
    "paymentMethod": "CASH",
    "referenceNumber": "REF-772911"
  }
  ```
* **Expected Status**: `200 OK`
* **Expected Response**: Saved Payment DTO.
* **Database Impact**: 
  * Inserts row in `payments`.
  * Decrements `balance_amount` on `orders` table.
  * Updates `payment_status` to `PARTIAL` or `PAID`.
