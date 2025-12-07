-- Migration: Add Set Support to Transactions
-- Run this in MySQL (phpMyAdmin, MySQL Workbench, or command line)

USE steritrack;

-- 1. Add itemType column to transaction_items
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we need to check first or just run it (will error if exists, but that's OK)

-- Check if column exists first (optional)
-- SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'steritrack' AND TABLE_NAME = 'transaction_items' AND COLUMN_NAME = 'itemType';

-- Add column (will error if already exists, that's fine)
ALTER TABLE transaction_items 
ADD COLUMN itemType VARCHAR(20) DEFAULT 'SINGLE';

-- 2. Create transaction_set_items table
CREATE TABLE IF NOT EXISTS transaction_set_items (
    transactionId VARCHAR(50),
    setId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (transactionId, setId),
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (setId) REFERENCES instrument_sets(id)
);

-- 3. Update existing data (mark all as SINGLE)
UPDATE transaction_items SET itemType = 'SINGLE' WHERE itemType IS NULL OR itemType = '';

-- 4. Verify migration
SELECT 'Migration completed!' as status;
SELECT COUNT(*) as transaction_items_count FROM transaction_items;
SELECT COUNT(*) as transaction_set_items_count FROM transaction_set_items;
