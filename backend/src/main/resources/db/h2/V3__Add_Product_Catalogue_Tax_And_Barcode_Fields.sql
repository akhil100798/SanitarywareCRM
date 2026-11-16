ALTER TABLE products ADD COLUMN barcode VARCHAR(100) NULL;
ALTER TABLE products ADD COLUMN hsn_code VARCHAR(20) NULL;
ALTER TABLE products ADD COLUMN gst_rate DECIMAL(5, 2) NULL;

ALTER TABLE products ADD CONSTRAINT uk_products_barcode UNIQUE (barcode);
