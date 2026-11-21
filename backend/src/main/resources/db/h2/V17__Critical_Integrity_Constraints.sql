-- Migration V17: Critical Integrity Constraints (H2 Dialect)

ALTER TABLE products ADD CONSTRAINT IF NOT EXISTS chk_product_mrp_positive CHECK (mrp > 0);
ALTER TABLE products ADD CONSTRAINT IF NOT EXISTS chk_product_selling_price CHECK (selling_price <= mrp);
ALTER TABLE products ADD CONSTRAINT IF NOT EXISTS chk_inventory_stock_non_negative CHECK (stock_quantity >= 0);

-- Phone number uniqueness on normalized digits is enforced on customers(phone_number) via uk_customers_phone_number (V2)

ALTER TABLE payments ADD CONSTRAINT IF NOT EXISTS chk_payment_amount_positive CHECK (amount > 0);

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

