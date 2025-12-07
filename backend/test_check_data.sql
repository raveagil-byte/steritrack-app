-- Quick Test: Check Data for Set Transaction Testing
-- Run this before testing to ensure all data is ready

USE steritrack;

-- ========================================
-- 1. CHECK INSTRUMENT SETS
-- ========================================
SELECT 
    '=== INSTRUMENT SETS ===' as info,
    '' as id,
    '' as name,
    '' as active,
    '' as item_count;

SELECT 
    s.id,
    s.name,
    CASE WHEN s.is_active = 1 THEN 'YES' ELSE 'NO' END as active,
    COUNT(isi.instrumentId) as item_count
FROM instrument_sets s
LEFT JOIN instrument_set_items isi ON s.id = isi.setId
GROUP BY s.id
ORDER BY s.is_active DESC, s.name;

-- ========================================
-- 2. CHECK SET CONTENTS
-- ========================================
SELECT 
    '=== SET CONTENTS ===' as info,
    '' as set_name,
    '' as instrument,
    '' as qty_per_set,
    '' as cssd_stock;

SELECT 
    s.name as set_name,
    i.name as instrument,
    isi.quantity as qty_per_set,
    i.cssdStock as cssd_stock
FROM instrument_set_items isi
JOIN instrument_sets s ON isi.setId = s.id
JOIN instruments i ON isi.instrumentId = i.id
WHERE s.is_active = 1
ORDER BY s.name, i.name;

-- ========================================
-- 3. CHECK UNITS
-- ========================================
SELECT 
    '=== AVAILABLE UNITS ===' as info,
    '' as id,
    '' as name,
    '' as active;

SELECT 
    id,
    name,
    CASE WHEN is_active = 1 THEN 'YES' ELSE 'NO' END as active
FROM units
WHERE is_active = 1
ORDER BY name;

-- ========================================
-- 4. CHECK CSSD STOCK
-- ========================================
SELECT 
    '=== CSSD STOCK (Top 10) ===' as info,
    '' as id,
    '' as name,
    '' as cssd_stock,
    '' as total_stock;

SELECT 
    id,
    name,
    cssdStock as cssd_stock,
    totalStock as total_stock
FROM instruments
WHERE cssdStock > 0
ORDER BY cssdStock DESC
LIMIT 10;

-- ========================================
-- 5. CHECK RECENT TRANSACTIONS
-- ========================================
SELECT 
    '=== RECENT TRANSACTIONS ===' as info,
    '' as id,
    '' as type,
    '' as status,
    '' as items,
    '' as sets;

SELECT 
    t.id,
    t.type,
    t.status,
    COUNT(DISTINCT ti.instrumentId) as items,
    COUNT(DISTINCT tsi.setId) as sets
FROM transactions t
LEFT JOIN transaction_items ti ON t.id = ti.transactionId
LEFT JOIN transaction_set_items tsi ON t.id = tsi.transactionId
GROUP BY t.id
ORDER BY t.timestamp DESC
LIMIT 5;

-- ========================================
-- 6. SUMMARY
-- ========================================
SELECT 
    '=== SUMMARY ===' as info,
    '' as metric,
    '' as count;

SELECT 'Active Sets' as metric, COUNT(*) as count FROM instrument_sets WHERE is_active = 1
UNION ALL
SELECT 'Active Units', COUNT(*) FROM units WHERE is_active = 1
UNION ALL
SELECT 'Instruments with Stock', COUNT(*) FROM instruments WHERE cssdStock > 0
UNION ALL
SELECT 'Total Transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'Pending Transactions', COUNT(*) FROM transactions WHERE status = 'PENDING';

-- ========================================
-- 7. READINESS CHECK
-- ========================================
SELECT 
    '=== READINESS CHECK ===' as info,
    '' as check_item,
    '' as status;

SELECT 
    'Has Active Sets' as check_item,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM instrument_sets WHERE is_active = 1
UNION ALL
SELECT 
    'Has Active Units',
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM units WHERE is_active = 1
UNION ALL
SELECT 
    'Has CSSD Stock',
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM instruments WHERE cssdStock > 0
UNION ALL
SELECT 
    'Backend Running',
    '⚠️  CHECK MANUALLY' as status;
