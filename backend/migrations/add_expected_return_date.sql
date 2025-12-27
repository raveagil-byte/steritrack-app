-- Migration: Add expectedReturnDate to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expectedreturndate BIGINT;
