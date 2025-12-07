-- ========================================
-- QUERY: Instrumen yang Sudah Masuk Set
-- ========================================

USE steritrack;

-- ========================================
-- 1. SUMMARY: Instrumen per Set
-- ========================================
SELECT 
    '=== INSTRUMEN PER SET ===' as info,
    '' as set_name,
    '' as total_items,
    '' as total_quantity;

SELECT 
    s.name as set_name,
    COUNT(DISTINCT isi.instrumentId) as total_items,
    SUM(isi.quantity) as total_quantity
FROM instrument_sets s
LEFT JOIN instrument_set_items isi ON s.id = isi.setId
WHERE s.is_active = 1
GROUP BY s.id, s.name
ORDER BY s.name;

-- ========================================
-- 2. DETAIL: Isi Setiap Set
-- ========================================
SELECT 
    '=== DETAIL ISI SET ===' as info,
    '' as set_name,
    '' as instrument_name,
    '' as quantity,
    '' as category;

SELECT 
    s.name as set_name,
    i.name as instrument_name,
    isi.quantity,
    i.category
FROM instrument_sets s
JOIN instrument_set_items isi ON s.id = isi.setId
JOIN instruments i ON isi.instrumentId = i.id
WHERE s.is_active = 1
ORDER BY s.name, i.name;

-- ========================================
-- 3. INSTRUMEN: Berapa Kali Masuk Set
-- ========================================
SELECT 
    '=== INSTRUMEN USAGE IN SETS ===' as info,
    '' as instrument_name,
    '' as used_in_sets,
    '' as total_quantity,
    '' as set_names;

SELECT 
    i.name as instrument_name,
    COUNT(DISTINCT isi.setId) as used_in_sets,
    SUM(isi.quantity) as total_quantity,
    GROUP_CONCAT(s.name SEPARATOR ', ') as set_names
FROM instruments i
LEFT JOIN instrument_set_items isi ON i.id = isi.instrumentId
LEFT JOIN instrument_sets s ON isi.setId = s.id AND s.is_active = 1
GROUP BY i.id, i.name
HAVING used_in_sets > 0
ORDER BY used_in_sets DESC, i.name;

-- ========================================
-- 4. INSTRUMEN YANG BELUM MASUK SET
-- ========================================
SELECT 
    '=== INSTRUMEN BELUM MASUK SET ===' as info,
    '' as instrument_name,
    '' as category,
    '' as cssd_stock;

SELECT 
    i.name as instrument_name,
    i.category,
    i.cssdStock as cssd_stock
FROM instruments i
WHERE i.id NOT IN (
    SELECT DISTINCT instrumentId 
    FROM instrument_set_items
)
AND i.is_active = 1
ORDER BY i.category, i.name;

-- ========================================
-- 5. SET DENGAN INSTRUMEN TERBANYAK
-- ========================================
SELECT 
    '=== SET TERBESAR ===' as info,
    '' as set_name,
    '' as item_count,
    '' as total_pieces;

SELECT 
    s.name as set_name,
    COUNT(isi.instrumentId) as item_count,
    SUM(isi.quantity) as total_pieces
FROM instrument_sets s
JOIN instrument_set_items isi ON s.id = isi.setId
WHERE s.is_active = 1
GROUP BY s.id, s.name
ORDER BY total_pieces DESC, item_count DESC;

-- ========================================
-- 6. STATISTIK GLOBAL
-- ========================================
SELECT 
    '=== STATISTIK GLOBAL ===' as info,
    '' as metric,
    '' as value;

SELECT 'Total Active Sets' as metric, COUNT(*) as value 
FROM instrument_sets WHERE is_active = 1
UNION ALL
SELECT 'Total Instruments in Sets', COUNT(DISTINCT instrumentId) 
FROM instrument_set_items
UNION ALL
SELECT 'Total Set Items (with qty)', SUM(quantity) 
FROM instrument_set_items isi
JOIN instrument_sets s ON isi.setId = s.id
WHERE s.is_active = 1
UNION ALL
SELECT 'Instruments NOT in Sets', COUNT(*) 
FROM instruments i
WHERE i.id NOT IN (SELECT DISTINCT instrumentId FROM instrument_set_items)
AND i.is_active = 1
UNION ALL
SELECT 'Average Items per Set', ROUND(AVG(item_count), 2)
FROM (
    SELECT COUNT(instrumentId) as item_count
    FROM instrument_set_items isi
    JOIN instrument_sets s ON isi.setId = s.id
    WHERE s.is_active = 1
    GROUP BY s.id
) as set_stats;

-- ========================================
-- 7. DETAIL LENGKAP UNTUK EXPORT
-- ========================================
SELECT 
    '=== EXPORT DATA ===' as info,
    '' as set_id,
    '' as set_name,
    '' as instrument_id,
    '' as instrument_name,
    '' as quantity,
    '' as category;

SELECT 
    s.id as set_id,
    s.name as set_name,
    i.id as instrument_id,
    i.name as instrument_name,
    isi.quantity,
    i.category
FROM instrument_sets s
JOIN instrument_set_items isi ON s.id = isi.setId
JOIN instruments i ON isi.instrumentId = i.id
WHERE s.is_active = 1
ORDER BY s.name, i.name;
