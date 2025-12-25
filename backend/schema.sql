-- STERITRACK SCHEMA V2 (Optimized)
-- This schema represents the target state of the database.
-- For existing databases, please run 'migration_v2.sql' to update structure.

-- 1. Master Data: Measurement Units
CREATE TABLE IF NOT EXISTS measurement_units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);
INSERT IGNORE INTO measurement_units (id, name, description) VALUES ('mu1', 'Pcs', 'Pieces'), ('mu2', 'Set', 'Instrument Set'), ('mu3', 'Box', 'Box');

-- 2. Master Data: Roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);
INSERT IGNORE INTO roles (id, name) VALUES ('r-admin', 'ADMIN'), ('r-cssd', 'CSSD'), ('r-nurse', 'NURSE');

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL, -- In production, hash this!
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL, -- Legacy role column (kept for compatibility)
    unitId VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);

-- User Roles (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    userId VARCHAR(50),
    roleId VARCHAR(50),
    PRIMARY KEY (userId, roleId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
);

-- 4. Units
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    qrCode VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Instruments
CREATE TABLE IF NOT EXISTS instruments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    totalStock INT NOT NULL DEFAULT 0,
    cssdStock INT NOT NULL DEFAULT 0,
    dirtyStock INT NOT NULL DEFAULT 0,
    packingStock INT NOT NULL DEFAULT 0,
    brokenStock INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    measure_unit_id VARCHAR(50) DEFAULT 'mu1',
    is_serialized BOOLEAN DEFAULT FALSE
);

-- 6. Instrument Categories / Sets
CREATE TABLE IF NOT EXISTS instrument_sets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Instrument Set Versions
CREATE TABLE IF NOT EXISTS instrument_set_versions (
    id VARCHAR(50) PRIMARY KEY,
    setId VARCHAR(50),
    version_number INT NOT NULL DEFAULT 1,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id VARCHAR(50),
    is_version_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (setId) REFERENCES instrument_sets(id) ON DELETE CASCADE
);

-- Items within a Set (Linked to Version)
CREATE TABLE IF NOT EXISTS instrument_set_items (
    setId VARCHAR(50),
    instrumentId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    versionId VARCHAR(50), -- Link to specific version
    PRIMARY KEY (setId, instrumentId), -- Note: In strict V2 this might change to use versionId as key, but preserving legac
    FOREIGN KEY (setId) REFERENCES instrument_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE
);

-- 7. Inventory Snapshots (Cache Table for Unit Stock)
CREATE TABLE IF NOT EXISTS inventory_snapshots (
    unitId VARCHAR(50),
    instrumentId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (unitId, instrumentId),
    FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE
);

-- Legacy Instrument Stock per Unit (Deprecating, but kept for safe rollback if needed)
CREATE TABLE IF NOT EXISTS instrument_unit_stock (
    instrumentId VARCHAR(50),
    unitId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 0,
    PRIMARY KEY (instrumentId, unitId),
    FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE,
    FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE
);

-- 8. Transaction Types & Statuses
CREATE TABLE IF NOT EXISTS transaction_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);
INSERT IGNORE INTO transaction_types (code, name) VALUES ('DISTRIBUTE', 'Distribution to Unit'), ('COLLECT', 'Collection from Unit'), ('STERILIZATION', 'Sterilization Process');

CREATE TABLE IF NOT EXISTS transaction_statuses (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
INSERT IGNORE INTO transaction_statuses (code, name) VALUES ('PENDING', 'Pending Validation'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled');

-- 9. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    unitId VARCHAR(50) NOT NULL, -- Legacy ref
    qrCode VARCHAR(100),
    createdBy VARCHAR(100), -- Legacy Name
    validatedBy VARCHAR(100), -- Legacy Name
    source_unit_id VARCHAR(50),
    destination_unit_id VARCHAR(50),
    created_by_user_id VARCHAR(50),
    validated_by_user_id VARCHAR(50),
    FOREIGN KEY (unitId) REFERENCES units(id)
);

-- Transaction Items
CREATE TABLE IF NOT EXISTS transaction_items (
    transactionId VARCHAR(50),
    instrumentId VARCHAR(50),
    count INT NOT NULL,
    itemType VARCHAR(20) DEFAULT 'SINGLE',
    brokenCount INT DEFAULT 0,
    missingCount INT DEFAULT 0,
    notes TEXT, -- New column for discrepancies
    PRIMARY KEY (transactionId, instrumentId),
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentId) REFERENCES instruments(id)
);

-- Transaction Set Items
CREATE TABLE IF NOT EXISTS transaction_set_items (
    transactionId VARCHAR(50),
    setId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    brokenCount INT DEFAULT 0,
    missingCount INT DEFAULT 0,
    notes TEXT,
    PRIMARY KEY (transactionId, setId),
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (setId) REFERENCES instrument_sets(id)
);

-- 10. Logistics & Packs (Sterile Containers)
CREATE TABLE IF NOT EXISTS sterile_packs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    targetUnitId VARCHAR(50),
    createdAt BIGINT NOT NULL,
    packedBy VARCHAR(100),
    expiresAt BIGINT,
    qrCode VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS sterile_pack_items (
    packId VARCHAR(50),
    instrumentId VARCHAR(50),
    itemType VARCHAR(20) DEFAULT 'SINGLE',
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (packId, instrumentId),
    FOREIGN KEY (packId) REFERENCES sterile_packs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaction_packs (
    transactionId VARCHAR(50),
    packId VARCHAR(50),
    PRIMARY KEY (transactionId, packId),
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (packId) REFERENCES sterile_packs(id) ON DELETE CASCADE
);

-- 11. Sterilization Machine Logs
CREATE TABLE IF NOT EXISTS sterilization_batches (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    machine VARCHAR(50) NOT NULL,
    operator VARCHAR(100),
    status VARCHAR(20) DEFAULT 'SUCCESS',
    startTime BIGINT,
    endTime BIGINT
);

CREATE TABLE IF NOT EXISTS sterilization_batch_items (
    batchId VARCHAR(50),
    itemId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (batchId, itemId),
    FOREIGN KEY (batchId) REFERENCES sterilization_batches(id) ON DELETE CASCADE
);

-- 12. Requests
CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    unitId VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    requestedBy VARCHAR(100) NOT NULL,
    FOREIGN KEY (unitId) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS request_items (
    requestId VARCHAR(50),
    itemId VARCHAR(50),
    itemType VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (requestId, itemId),
    FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
);

-- 13. Audit Logs (New)
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

-- Legacy Logs
CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL
);

-- --- INITIAL DATA SEEDING (If tables are empty) ---

INSERT IGNORE INTO units (id, name, qrCode, type) VALUES
('u1', 'IGD (Instalasi Gawat Darurat)', 'UNIT-IGD-001', 'IGD'),
('u2', 'Kamar Operasi 1 (OK)', 'UNIT-OK-001', 'OK'),
('u3', 'ICU Sentral', 'UNIT-ICU-001', 'ICU'),
('u-cssd', 'CSSD Central', 'UNIT-CSSD-001', 'CSSD');

INSERT IGNORE INTO users (id, username, password, name, role, unitId) VALUES
('user1', 'admin', '4dm1n123', 'Kepala Instalasi', 'ADMIN', NULL),
('user2', 'staff', '4dm1n123', 'Budi (CSSD)', 'CSSD', 'u-cssd'),
('user3', 'nurse', '4dm1n123', 'Siti (Perawat)', 'NURSE', 'u2');

INSERT IGNORE INTO instruments (id, name, category, totalStock, cssdStock, dirtyStock, measure_unit_id) VALUES
('i1', 'Set Bedah Mayor', 'Sets', 20, 15, 0, 'mu2'),
('i2', 'Set Bedah Minor', 'Sets', 30, 25, 0, 'mu2'),
('i3', 'Laringoskop', 'Device', 15, 10, 0, 'mu1'),
('i4', 'Gunting Bedah (Bengkok)', 'Single', 50, 40, 0, 'mu1'),
('i5', 'Pinset Anatomis', 'Single', 50, 45, 0, 'mu1');

INSERT IGNORE INTO instrument_sets (id, name, description) VALUES
('s1', 'Set Bedah Mayor', 'Perlengkapan standar untuk prosedur bedah besar.');

INSERT IGNORE INTO instrument_set_items (setId, instrumentId, quantity) VALUES
('s1', 'i4', 2),
('s1', 'i5', 2);
