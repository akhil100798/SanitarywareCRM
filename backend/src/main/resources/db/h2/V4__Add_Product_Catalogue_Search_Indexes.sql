CREATE INDEX idx_products_hsn_code ON products (hsn_code);
CREATE INDEX idx_products_is_active ON products (is_active);
CREATE INDEX idx_product_images_product_display ON product_images (product_id, display_order);
