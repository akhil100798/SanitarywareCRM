-- Migration V15: Add Reminder Automation Logs Table

CREATE TABLE IF NOT EXISTS reminder_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reminder_type VARCHAR(50) NOT NULL,
    reference_id BIGINT NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255),
    message_content TEXT,
    delivery_status VARCHAR(50) NOT NULL,
    error_detail TEXT,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminder_ref ON reminder_logs (reminder_type, reference_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_date ON reminder_logs (sent_at);
