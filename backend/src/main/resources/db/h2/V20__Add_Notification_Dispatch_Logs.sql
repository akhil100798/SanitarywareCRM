-- Migration V20: Add Notification Dispatch Logs Table (H2 Dialect)

CREATE TABLE IF NOT EXISTS notification_dispatch_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message_content TEXT,
    notification_type VARCHAR(100) NOT NULL,
    delivery_status VARCHAR(50) NOT NULL,
    error_detail TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    reference_id BIGINT,
    reference_number VARCHAR(100),
    sent_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ndl_status ON notification_dispatch_logs (delivery_status, created_at);
CREATE INDEX IF NOT EXISTS idx_ndl_channel ON notification_dispatch_logs (channel, notification_type);
CREATE INDEX IF NOT EXISTS idx_ndl_ref ON notification_dispatch_logs (reference_id, notification_type);
