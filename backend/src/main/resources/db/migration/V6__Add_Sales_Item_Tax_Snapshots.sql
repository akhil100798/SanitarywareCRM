ALTER TABLE quotation_items ADD COLUMN barcode VARCHAR(100) NULL;
ALTER TABLE quotation_items ADD COLUMN hsn_code VARCHAR(20) NULL;
ALTER TABLE quotation_items ADD COLUMN gst_rate DECIMAL(5, 2) NULL;

ALTER TABLE order_items ADD COLUMN barcode VARCHAR(100) NULL;
ALTER TABLE order_items ADD COLUMN hsn_code VARCHAR(20) NULL;
ALTER TABLE order_items ADD COLUMN gst_rate DECIMAL(5, 2) NULL;
