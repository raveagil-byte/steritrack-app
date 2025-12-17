-- FINAL UPDATE FOR CLOUD
-- Set IGD QR Code to standard: UNIT-IGD-0535

UPDATE units 
SET qrCode = 'UNIT-IGD-0535' 
WHERE type = 'IGD';

-- Also ensure OK and ICU are standard just in case
UPDATE units SET qrCode = 'UNIT-OK-001' WHERE type = 'OK';
UPDATE units SET qrCode = 'UNIT-ICU-001' WHERE type = 'ICU';

-- Verify
SELECT * FROM units;
