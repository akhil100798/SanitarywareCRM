-- Migration V16: Add Category Lead Time Days for AI Demand & Reorder Analytics
ALTER TABLE categories ADD COLUMN IF NOT EXISTS lead_time_days INT NOT NULL DEFAULT 14;
