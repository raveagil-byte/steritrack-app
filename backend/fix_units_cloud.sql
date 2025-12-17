-- FIX UNITS DATA
-- Run this on CLOUD Database to ensure QR Codes match

-- 1. Ensure Standard Units exist with correct QR Codes
INSERT INTO units (id, name, type, qrCode, is_active) VALUES
('u1', 'IGD (Instalasi Gawat Darurat)', 'IGD', 'UNIT-IGD-001', 1),
('u2', 'Kamar Operasi 1 (OK)', 'OK', 'UNIT-OK-001', 1),
('u3', 'ICU Sentral', 'ICU', 'UNIT-ICU-001', 1)
ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
qrCode = VALUES(qrCode), 
type = VALUES(type);

-- 2. Verify check
SELECT * FROM units;
