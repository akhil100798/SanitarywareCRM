ALTER TABLE users ADD COLUMN bootstrap_marker VARCHAR(32) NULL;
CREATE UNIQUE INDEX ux_users_bootstrap_marker ON users (bootstrap_marker);
