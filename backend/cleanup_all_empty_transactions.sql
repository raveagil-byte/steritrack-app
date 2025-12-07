-- Cleanup All Empty Transactions
-- Run this after backend restart to clean up orphaned transactions

USE steritrack;

-- Show empty transactions before cleanup
SELECT 
    t.id,
    t.type,
    t.status,
    t.createdBy,
    FROM_UNIXTIME(t.timestamp/1000) as created_at,
    'EMPTY' as issue
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_items ti WHERE ti.transactionId = t.id
)
AND NOT EXISTS (
    SELECT 1 FROM transaction_set_items tsi WHERE tsi.transactionId = t.id
);

-- Delete all empty transactions
DELETE FROM transactions
WHERE id NOT IN (
    SELECT DISTINCT transactionId FROM transaction_items
)
AND id NOT IN (
    SELECT DISTINCT transactionId FROM transaction_set_items
);

-- Show results
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

-- Verify no empty transactions remain
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: No empty transactions'
        ELSE CONCAT('WARNING: ', COUNT(*), ' empty transactions remain')
    END as status
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_items ti WHERE ti.transactionId = t.id
)
AND NOT EXISTS (
    SELECT 1 FROM transaction_set_items tsi WHERE tsi.transactionId = t.id
);
