-- Cleanup: Remove transactions without items
-- Purpose: Clean up orphaned transactions from testing/migration

USE steritrack;

-- Step 1: Show transactions without items (for review)
SELECT 
    t.id,
    t.type,
    t.status,
    FROM_UNIXTIME(t.timestamp/1000) as created_at
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_items ti WHERE ti.transactionId = t.id
)
AND NOT EXISTS (
    SELECT 1 FROM transaction_set_items tsi WHERE tsi.transactionId = t.id
);

-- Step 2: Delete orphaned transactions
DELETE FROM transactions
WHERE id NOT IN (
    SELECT DISTINCT transactionId FROM transaction_items
)
AND id NOT IN (
    SELECT DISTINCT transactionId FROM transaction_set_items
);

-- Step 3: Verify results
SELECT 
    'Remaining Transactions' as info,
    COUNT(*) as count 
FROM transactions;

SELECT 
    'Transaction Items' as info,
    COUNT(*) as count 
FROM transaction_items;

SELECT 
    'Transaction Set Items' as info,
    COUNT(*) as count 
FROM transaction_set_items;
