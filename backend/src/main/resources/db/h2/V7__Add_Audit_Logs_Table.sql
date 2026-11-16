CREATE TABLE audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_username VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    details VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
