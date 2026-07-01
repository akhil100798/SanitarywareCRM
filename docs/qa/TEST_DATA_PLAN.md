# TEST DATA PLAN

> [!WARNING]
> **TEST DATA ONLY — NOT PRODUCTION DATA**

This plan outlines the required test-only records to run positive and negative integration and E2E suites.

---

## 1. Test Users

### Admin Test User
* **Username**: `qaadmin`
* **Password**: `Password@123`
* **Email**: `qaadmin@maruthisanitary.com`
* **Phone**: `9440075230`
* **Role**: `ADMIN`

### Sales Test User
* **Username**: `qasales`
* **Password**: `Password@123`
* **Email**: `qasales@maruthisanitary.com`
* **Phone**: `9440075231`
* **Role**: `SALES`

---

## 2. Catalog & Inventory Data

### Sample Category
* **Name**: `PVC Pipes`
* **Description**: `Standard polyvinyl chloride plumbing conduits`
* **Parent Category**: None (Root)

### Sample Brand
* **Name**: `Supreme`

### Sample Product
* **SKU**: `SUP-PIPE-001`
* **Name**: `Supreme PVC Pipe 1 inch`
* **MRP**: `150.00`
* **Selling Price**: `135.00`
* **Purchase Price**: `95.00`
* **Stock Quantity**: `100`
* **Reorder Level**: `10`
* **Unit**: `PCS`

---

## 3. Partners Data

### Sample Customer
* **Name**: `Rahul Kumar`
* **Phone**: `9999999999`
* **Email**: `rahul.kumar@gmail.com`
* **Billing Address**: `123 Metro Road, Delhi`
* **Shipping Address**: `123 Metro Road, Delhi`
* **Customer Type**: `RETAIL`

### Sample Distributor
* **Name**: `Metro Plumbing Distributors`
* **Contact Person**: `Suresh Patel`
* **Phone**: `8888888888`
* **Email**: `metro@dist.com`
* **Outstanding Balance**: `0.00`

---

## 4. Document Transactions Data

### Sample Quotation
* **Customer**: `Rahul Kumar`
* **Quotation Date**: Today
* **Valid Until**: Today + 30 Days
* **Items**:
  * **Product**: `Supreme PVC Pipe 1 inch` (SUP-PIPE-001)
  * **Quantity**: `20`
  * **Unit Price**: `135.00`
  * **Line Total**: `2700.00`
* **Tax (GST 18%)**: `486.00`
* **Grand Total**: `3186.00`
* **Status**: `DRAFT`

### Sample Order (Converted from Quote)
* **Customer**: `Rahul Kumar`
* **Items**: Same as Quotation
* **Subtotal**: `2700.00`
* **Tax**: `486.00`
* **Grand Total**: `3186.00`
* **Paid Amount**: `0.00`
* **Balance Amount**: `3186.00`
* **Status**: `PENDING`
* **Payment Status**: `UNPAID`

### Sample Payment
* **Order ID**: Converted Order Reference
* **Amount**: `1500.00` (Partial payment)
* **Payment Method**: `CASH`
* **Reference Number**: `TXN-88201`

### Sample Purchase Order
* **Distributor**: `Metro Plumbing Distributors`
* **Items**:
  * **Product**: `Supreme PVC Pipe 1 inch` (SUP-PIPE-001)
  * **Quantity**: `100`
  * **Unit Cost**: `95.00`
  * **Line Total**: `9500.00`
* **Total Cost**: `9500.00`
* **Status**: `DRAFT`
