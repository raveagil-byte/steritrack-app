-- MIGRATION SCRIPT V2 - SIAPPMEN (STERITRACK)
-- Applying optimized database design based on Evaluation Report v2.0
-- WARNING: This script modifies table structures. BACKUP YOUR DATA FIRST!

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create Measurement Units & Normalize Instruments
CREATE TABLE IF NOT EXISTS measurement_units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);
INSERT IGNORE INTO measurement_units (id, name, description) VALUES ('mu1', 'Pcs', 'Pieces'), ('mu2', 'Set', 'Instrument Set'), ('mu3', 'Box', 'Box');

ALTER TABLE instruments ADD COLUMN measure_unit_id VARCHAR(50) DEFAULT 'mu1';
-- NOTE: We are keeping the old stock columns TEMPORARILY for data migration, they will be dropped later or ignored.

-- 2. Create Roles & User Roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);
INSERT IGNORE INTO roles (id, name) VALUES ('r-admin', 'ADMIN'), ('r-cssd', 'CSSD'), ('r-nurse', 'NURSE');

CREATE TABLE IF NOT EXISTS user_roles (
    userId VARCHAR(50),
    roleId VARCHAR(50),
    PRIMARY KEY (userId, roleId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
);

-- Migrate existing roles from users table to user_roles
INSERT IGNORE INTO user_roles (userId, roleId)
SELECT id, CONCAT('r-', LOWER(role)) FROM users WHERE role IN ('ADMIN', 'CSSD', 'NURSE');

-- 3. Create Transaction Master Data
CREATE TABLE IF NOT EXISTS transaction_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);
INSERT IGNORE INTO transaction_types (code, name) VALUES 
('DISTRIBUTE', 'Distribution to Unit'),
('COLLECT', 'Collection from Unit'),
('STERILIZATION', 'Sterilization Process');

CREATE TABLE IF NOT EXISTS transaction_statuses (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
INSERT IGNORE INTO transaction_statuses (code, name) VALUES 
('PENDING', 'Pending Validation'),
('COMPLETED', 'Completed'),
('CANCELLED', 'Cancelled');

-- 4. Update Transactions Table structure
-- We need to handle source/dest units. For logic:
-- IF Type=DISTRIBUTE: Source=CSSD, Dest=unitId
-- IF Type=COLLECT: Source=unitId, Dest=CSSD
ALTER TABLE transactions ADD COLUMN source_unit_id VARCHAR(50);
ALTER TABLE transactions ADD COLUMN destination_unit_id VARCHAR(50);
ALTER TABLE transactions ADD COLUMN created_by_user_id VARCHAR(50);
ALTER TABLE transactions ADD COLUMN validated_by_user_id VARCHAR(50);

-- Migrate old data to new columns
UPDATE transactions SET created_by_user_id = createdBy, validated_by_user_id = validatedBy;

UPDATE transactions SET 
    source_unit_id = 'u-cssd', -- Assuming a CSSD unit exists, if not we might need to create one or leave NULL
    destination_unit_id = unitId
WHERE type = 'DISTRIBUTE';

UPDATE transactions SET 
    source_unit_id = unitId,
    destination_unit_id = 'u-cssd'
WHERE type = 'COLLECT';


-- 5. Inventory Snapshots (Cache Table)
CREATE TABLE IF NOT EXISTS inventory_snapshots (
    unitId VARCHAR(50),
    instrumentId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (unitId, instrumentId),
    FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE
);

-- Init snapshot from old instrument_unit_stock
INSERT IGNORE INTO inventory_snapshots (unitId, instrumentId, quantity)
SELECT unitId, instrumentId, quantity FROM instrument_unit_stock;


-- 6. Instrument Set Versioning
CREATE TABLE IF NOT EXISTS instrument_set_versions (
    id VARCHAR(50) PRIMARY KEY,
    setId VARCHAR(50),
    version_number INT NOT NULL DEFAULT 1,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id VARCHAR(50),
    is_version_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (setId) REFERENCES instrument_sets(id) ON DELETE CASCADE
);

-- Create initial v1 for all existing sets
INSERT INTO instrument_set_versions (id, setId, version_number, effective_date)
SELECT CONCAT(id, '-v1'), id, 1, NOW() FROM instrument_sets;

-- Update instrument_set_items to link to version instead of set directly
-- This is tricky because we need to migrate data.
ALTER TABLE instrument_set_items ADD COLUMN versionId VARCHAR(50);

UPDATE instrument_set_items isi
JOIN instrument_set_versions isv ON isi.setId = isv.setId
SET isi.versionId = isv.id;

-- Now ideally we would drop the old FK and make versionId the PK/FK, but let's keep it safe for now.
-- ALTER TABLE instrument_set_items DROP FOREIGN KEY ...; 


-- 7. Audit Logs (Enhanced)
CREATE TABLE IF NOT EXISTS audit_logs_new (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_table VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

SET FOREIGN_KEY_CHECKS = 1;

-- END OF MIGRATION
