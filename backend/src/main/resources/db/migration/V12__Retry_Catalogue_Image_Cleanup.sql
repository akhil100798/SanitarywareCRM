CREATE TABLE catalogue_image_cleanup_tasks (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(64) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    CONSTRAINT uk_catalogue_image_cleanup_batch_url UNIQUE (batch_id, image_url)
);
