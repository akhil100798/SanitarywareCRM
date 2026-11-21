-- Migration V17: Critical Integrity Constraints

ALTER TABLE products ADD CONSTRAINT chk_product_mrp_positive CHECK (mrp > 0);
ALTER TABLE products ADD CONSTRAINT chk_product_selling_price CHECK (selling_price <= mrp);
ALTER TABLE products ADD CONSTRAINT chk_inventory_stock_non_negative CHECK (stock_quantity >= 0);

-- Phone number uniqueness on normalized digits is enforced on customers(phone_number) via uk_customers_phone_number (V2)

ALTER TABLE payments ADD CONSTRAINT chk_payment_amount_positive CHECK (amount > 0);

ALTER TABLE purchase_orders ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

