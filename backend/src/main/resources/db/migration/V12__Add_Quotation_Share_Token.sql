ALTER TABLE quotations ADD COLUMN share_token VARCHAR(64) NULL;
CREATE UNIQUE INDEX uk_quotations_share_token ON quotations (share_token);
