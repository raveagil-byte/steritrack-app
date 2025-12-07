-- ========================================
-- QUERY: Detect Stock Discrepancies
-- Purpose: Find missing/extra items
-- ========================================

USE steritrack;

-- ========================================
-- 1. STOCK RECONCILIATION
-- ========================================
SELECT 
    '=== STOCK RECONCILIATION ===' as info,
    '' as instrument,
    '' as total_stock,
    '' as cssd_stock,
    '' as dirty_stock,
    '' as unit_stock,
    '' as calculated,
    '' as discrepancy;

SELECT 
    i.name as instrument,
    i.totalStock as total_stock,
    i.cssdStock as cssd_stock,
    i.dirtyStock as dirty_stock,
    COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0) as unit_stock,
    (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0)) as calculated,
    (i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) as discrepancy
FROM instruments i
WHERE i.is_active = 1
HAVING discrepancy != 0
ORDER BY ABS(discrepancy) DESC;

-- ========================================
-- 2. MISSING ITEMS (Negative Discrepancy)
-- ========================================
SELECT 
    '=== MISSING ITEMS ===' as info,
    '' as instrument,
    '' as missing_qty,
    '' as total_stock,
    '' as accounted_for;

SELECT 
    i.name as instrument,
    ABS(i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) as missing_qty,
    i.totalStock as total_stock,
    (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0)) as accounted_for
FROM instruments i
WHERE i.is_active = 1
  AND (i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) < 0
ORDER BY missing_qty DESC;

-- ========================================
-- 3. EXTRA ITEMS (Positive Discrepancy)
-- ========================================
SELECT 
    '=== EXTRA ITEMS ===' as info,
    '' as instrument,
    '' as extra_qty,
    '' as total_stock,
    '' as accounted_for;

SELECT 
    i.name as instrument,
    (i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) as extra_qty,
    i.totalStock as total_stock,
    (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0)) as accounted_for
FROM instruments i
WHERE i.is_active = 1
  AND (i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) > 0
ORDER BY extra_qty DESC;

-- ========================================
-- 4. RECENT COLLECT TRANSACTIONS
-- ========================================
SELECT 
    '=== RECENT COLLECT TRANSACTIONS ===' as info,
    '' as tx_id,
    '' as unit,
    '' as status,
    '' as created_by,
    '' as validated_by,
    '' as date;

SELECT 
    t.id as tx_id,
    u.name as unit,
    t.status,
    t.createdBy as created_by,
    t.validatedBy as validated_by,
    FROM_UNIXTIME(t.timestamp/1000) as date
FROM transactions t
LEFT JOIN units u ON t.unitId = u.id
WHERE t.type = 'COLLECT'
ORDER BY t.timestamp DESC
LIMIT 10;

-- ========================================
-- 5. ITEMS IN RECENT COLLECT TRANSACTIONS
-- ========================================
SELECT 
    '=== ITEMS IN COLLECT TRANSACTIONS ===' as info,
    '' as tx_id,
    '' as instrument,
    '' as expected_qty,
    '' as status;

SELECT 
    t.id as tx_id,
    i.name as instrument,
    ti.count as expected_qty,
    t.status
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transactionId
JOIN instruments i ON ti.instrumentId = i.id
WHERE t.type = 'COLLECT'
ORDER BY t.timestamp DESC
LIMIT 20;

-- ========================================
-- 6. SUMMARY STATISTICS
-- ========================================
SELECT 
    '=== SUMMARY ===' as info,
    '' as metric,
    '' as value;

SELECT 'Total Instruments' as metric, COUNT(*) as value FROM instruments WHERE is_active = 1
UNION ALL
SELECT 'Instruments with Discrepancy', COUNT(*) 
FROM instruments i
WHERE i.is_active = 1
  AND (i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) != 0
UNION ALL
SELECT 'Total Missing Items', COALESCE(SUM(ABS(discrepancy)), 0)
FROM (
    SELECT (i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) as discrepancy
    FROM instruments i
    WHERE i.is_active = 1
      AND (i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) < 0
) as missing
UNION ALL
SELECT 'Total Collect Transactions', COUNT(*) 
FROM transactions 
WHERE type = 'COLLECT'
UNION ALL
SELECT 'Pending Collect Transactions', COUNT(*) 
FROM transactions 
WHERE type = 'COLLECT' AND status = 'PENDING';

-- ========================================
-- 7. DETAILED STOCK BREAKDOWN
-- ========================================
SELECT 
    '=== DETAILED STOCK BREAKDOWN ===' as info,
    '' as instrument,
    '' as total,
    '' as cssd,
    '' as dirty,
    '' as units,
    '' as calc,
    '' as diff;

SELECT 
    i.name as instrument,
    i.totalStock as total,
    i.cssdStock as cssd,
    i.dirtyStock as dirty,
    COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0) as units,
    (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0)) as calc,
    (i.totalStock - (i.cssdStock + i.dirtyStock + COALESCE((SELECT SUM(quantity) FROM instrument_unit_stock WHERE instrumentId = i.id), 0))) as diff
FROM instruments i
WHERE i.is_active = 1
ORDER BY i.name;
