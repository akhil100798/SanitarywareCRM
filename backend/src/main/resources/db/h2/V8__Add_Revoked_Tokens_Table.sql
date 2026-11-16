CREATE TABLE revoked_tokens (
    token_fingerprint VARCHAR(64) NOT NULL PRIMARY KEY,
    expires_at DATETIME(6) NOT NULL
);

CREATE INDEX idx_revoked_tokens_expires_at ON revoked_tokens (expires_at);
