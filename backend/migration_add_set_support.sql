-- Migration Script: Add Set Support to Transactions
-- Run this AFTER initial schema.sql if database already exists

USE steritrack;

-- 1. Add itemType column to existing transaction_items table
ALTER TABLE transaction_items 
ADD COLUMN IF NOT EXISTS itemType VARCHAR(20) DEFAULT 'SINGLE';

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
UPDATE transaction_items SET itemType = 'SINGLE' WHERE itemType IS NULL;

SELECT 'Migration completed successfully!' as status;
