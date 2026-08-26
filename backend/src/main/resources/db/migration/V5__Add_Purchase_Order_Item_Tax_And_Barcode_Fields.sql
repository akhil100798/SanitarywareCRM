ALTER TABLE purchase_order_items ADD COLUMN barcode VARCHAR(100) NULL;
ALTER TABLE purchase_order_items ADD COLUMN hsn_code VARCHAR(20) NULL;
ALTER TABLE purchase_order_items ADD COLUMN gst_rate DECIMAL(5, 2) NULL;
