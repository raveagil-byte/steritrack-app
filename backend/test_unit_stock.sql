-- Test Script: Manual Insert untuk Verifikasi Sistem
USE steritrack;

-- 1. Cek instruments yang tersedia
SELECT id, name, cssdStock FROM instruments LIMIT 5;

-- 2. Cek units yang tersedia  
SELECT id, name FROM units LIMIT 5;

-- 3. Insert manual test data ke instrument_unit_stock
-- Ganti 'INSTRUMENT_ID' dan 'UNIT_ID' dengan ID yang sebenarnya dari query di atas
-- Contoh: INSERT INTO instrument_unit_stock VALUES ('i-123', 'u1', 5);

-- INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity) 
-- VALUES ('INSTRUMENT_ID_DARI_STEP_1', 'UNIT_ID_DARI_STEP_2', 5);

-- 4. Verifikasi data masuk
SELECT 
    i.name as instrument_name,
    u.name as unit_name,
    ius.quantity
FROM instrument_unit_stock ius
JOIN instruments i ON ius.instrumentId = i.id
JOIN units u ON ius.unitId = u.id;

-- 5. Test query yang digunakan backend
SELECT unitId, quantity FROM instrument_unit_stock WHERE instrumentId = 'INSTRUMENT_ID';
