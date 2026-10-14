ALTER TABLE product_images ADD COLUMN catalogue_import_batch_id VARCHAR(64) NULL;

CREATE INDEX idx_product_images_catalogue_import_batch
    ON product_images (catalogue_import_batch_id);
