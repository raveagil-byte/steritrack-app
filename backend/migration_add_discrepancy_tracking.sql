-- Add brokenStock to instruments
ALTER TABLE instruments ADD COLUMN brokenStock INT NOT NULL DEFAULT 0;

-- Add discrepancy columns to transaction items
ALTER TABLE transaction_items ADD COLUMN brokenCount INT NOT NULL DEFAULT 0;
ALTER TABLE transaction_items ADD COLUMN missingCount INT NOT NULL DEFAULT 0;

-- Add discrepancy columns to transaction set items
ALTER TABLE transaction_set_items ADD COLUMN brokenCount INT NOT NULL DEFAULT 0;
ALTER TABLE transaction_set_items ADD COLUMN missingCount INT NOT NULL DEFAULT 0;
