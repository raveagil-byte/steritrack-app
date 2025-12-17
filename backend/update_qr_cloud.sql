-- FIX SPECIFIC UNIT
-- Target unit with ID u-1765095980535 and set its QR Code

UPDATE units 
SET qrCode = 'UNIT-IGD-0535'
WHERE id = 'u-1765095980535';

-- Check result
SELECT id, name, type, qrCode FROM units WHERE id = 'u-1765095980535';
