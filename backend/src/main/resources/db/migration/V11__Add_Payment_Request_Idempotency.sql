CREATE TABLE payment_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT NOT NULL,
    operation VARCHAR(32) NOT NULL,
    key_hash CHAR(64) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    payment_id BIGINT NOT NULL,
    response_json LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_payment_request UNIQUE (actor_id, operation, key_hash),
    CONSTRAINT fk_payment_request_actor FOREIGN KEY (actor_id) REFERENCES users(id)
);
-- Deliberately retain the request after a receipt is reversed/deleted. There is
-- no receipt FK: a retry must never recreate a reversed financial operation.
