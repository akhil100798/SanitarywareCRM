-- V19: Add Bin Location column to products table (BUG-099, BUG-157)
ALTER TABLE products ADD COLUMN bin_location VARCHAR(50);
