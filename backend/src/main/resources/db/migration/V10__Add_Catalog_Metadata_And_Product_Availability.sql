ALTER TABLE brands
    ADD COLUMN catalog_file_name VARCHAR(255) NULL,
    ADD COLUMN catalog_storage_key VARCHAR(500) NULL;

ALTER TABLE products
    ADD COLUMN material_code VARCHAR(100) NULL,
    ADD COLUMN item_code VARCHAR(100) NULL,
    ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT TRUE;
