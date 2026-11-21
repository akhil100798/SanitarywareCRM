CREATE TABLE IF NOT EXISTS catalog_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    version_tag VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    total_products INT NOT NULL DEFAULT 0,
    created_count INT NOT NULL DEFAULT 0,
    updated_count INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NULL,
    CONSTRAINT fk_cat_ver_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cat_ver_brand_date ON catalog_versions (brand_id, created_at);

CREATE TABLE IF NOT EXISTS product_price_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    catalog_version_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    sku VARCHAR(50) NOT NULL,
    old_mrp DECIMAL(10, 2) NULL,
    new_mrp DECIMAL(10, 2) NOT NULL,
    old_selling_price DECIMAL(10, 2) NULL,
    new_selling_price DECIMAL(10, 2) NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pph_version FOREIGN KEY (catalog_version_id) REFERENCES catalog_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_pph_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pph_version ON product_price_history (catalog_version_id);
CREATE INDEX IF NOT EXISTS idx_pph_product ON product_price_history (product_id);
