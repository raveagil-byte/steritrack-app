-- STERITRACK SCHEMA V2 (PostgreSQL Optimized - Lowercase)

-- 1. Master Data: Measurement Units
CREATE TABLE IF NOT EXISTS measurement_units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);
INSERT INTO measurement_units(id, name, description) VALUES ('mu1', 'Pcs', 'Pieces'), ('mu2', 'Set', 'Instrument Set'), ('mu3', 'Box', 'Box') ON CONFLICT DO NOTHING;

-- 2. Master Data: Roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT
);
INSERT INTO roles(id, name) VALUES ('r-admin', 'ADMIN'), ('r-cssd', 'CSSD'), ('r-nurse', 'NURSE') ON CONFLICT DO NOTHING;

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL, 
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    unitid VARCHAR(50), -- mapped to unitId
    is_active BOOLEAN DEFAULT TRUE,
    phone VARCHAR(20),
    photo_url TEXT
);

-- User Roles (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    userid VARCHAR(50),
    roleid VARCHAR(50),
    PRIMARY KEY (userid, roleid),
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (roleid) REFERENCES roles(id) ON DELETE CASCADE
);

-- 4. Units
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    qrcode VARCHAR(100), -- mapped to qrCode
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Instruments
CREATE TABLE IF NOT EXISTS instruments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    totalstock INTEGER NOT NULL DEFAULT 0, -- totalStock
    cssdstock INTEGER NOT NULL DEFAULT 0,  -- cssdStock
    dirtystock INTEGER NOT NULL DEFAULT 0, -- dirtyStock
    packingstock INTEGER NOT NULL DEFAULT 0, -- packingStock
    brokenstock INTEGER NOT NULL DEFAULT 0, -- brokenStock
    is_active BOOLEAN DEFAULT TRUE,
    measure_unit_id VARCHAR(50) DEFAULT 'mu1',
    is_serialized BOOLEAN DEFAULT FALSE
);

-- 5b. Individual Instrument Assets (Serialized)
CREATE TABLE IF NOT EXISTS instrument_assets (
    id VARCHAR(50) PRIMARY KEY,
    instrumentid VARCHAR(50) NOT NULL,
    serialnumber VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'READY', -- READY, IN_USE, DIRTY, CSSD, BROKEN
    location VARCHAR(50) DEFAULT 'CSSD',
    notes TEXT,
    usagecount INTEGER DEFAULT 0,
    createdat BIGINT,
    updatedat BIGINT,
    FOREIGN KEY (instrumentid) REFERENCES instruments(id) ON DELETE CASCADE,
    UNIQUE(instrumentid, serialnumber)
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
    setid VARCHAR(50), -- setId
    version_number INTEGER NOT NULL DEFAULT 1,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id VARCHAR(50),
    is_version_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (setid) REFERENCES instrument_sets(id) ON DELETE CASCADE
);

-- Items within a Set
CREATE TABLE IF NOT EXISTS instrument_set_items (
    setid VARCHAR(50), -- setId
    instrumentid VARCHAR(50), -- instrumentId
    quantity INTEGER NOT NULL DEFAULT 1,
    versionid VARCHAR(50), -- versionId
    PRIMARY KEY (setid, instrumentid),
    FOREIGN KEY (setid) REFERENCES instrument_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentid) REFERENCES instruments(id) ON DELETE CASCADE
);

-- 7. Inventory Snapshots
CREATE TABLE IF NOT EXISTS inventory_snapshots (
    unitid VARCHAR(50), -- unitId
    instrumentid VARCHAR(50), -- instrumentId
    quantity INTEGER NOT NULL DEFAULT 0,
    max_stock INTEGER DEFAULT 0, -- target par level
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (unitid, instrumentid),
    FOREIGN KEY (unitid) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentid) REFERENCES instruments(id) ON DELETE CASCADE
);

-- Legacy Instrument Stock per Unit
CREATE TABLE IF NOT EXISTS instrument_unit_stock (
    instrumentid VARCHAR(50), -- instrumentId
    unitid VARCHAR(50), -- unitId
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (instrumentid, unitid),
    FOREIGN KEY (instrumentid) REFERENCES instruments(id) ON DELETE CASCADE,
    FOREIGN KEY (unitid) REFERENCES units(id) ON DELETE CASCADE
);

-- 8. Transaction Types & Statuses
CREATE TABLE IF NOT EXISTS transaction_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);
INSERT INTO transaction_types(code, name) VALUES ('DISTRIBUTE', 'Distribution to Unit'), ('COLLECT', 'Collection from Unit'), ('STERILIZATION', 'Sterilization Process') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS transaction_statuses (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
INSERT INTO transaction_statuses(code, name) VALUES ('PENDING', 'Pending Validation'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled') ON CONFLICT DO NOTHING;

-- 9. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    unitid VARCHAR(50) NOT NULL, -- unitId
    qrcode VARCHAR(100), -- qrCode
    createdby VARCHAR(100), -- createdBy
    validatedby VARCHAR(100), -- validatedBy
    source_unit_id VARCHAR(50),
    destination_unit_id VARCHAR(50),
    created_by_user_id VARCHAR(50),
    validated_by_user_id VARCHAR(50),
    validatedat BIGINT, -- validatedAt
    validationstatus VARCHAR(20), -- validationStatus
    validationnotes TEXT, -- validationNotes
    expectedreturndate BIGINT, -- expectedReturnDate (for DISTRIBUTE type)
    FOREIGN KEY (unitid) REFERENCES units(id)
);

-- Transaction Items
CREATE TABLE IF NOT EXISTS transaction_items (
    transactionid VARCHAR(50), -- transactionId
    instrumentid VARCHAR(50), -- instrumentId
    count INTEGER NOT NULL,
    itemtype VARCHAR(20) DEFAULT 'SINGLE',
    brokencount INTEGER DEFAULT 0, -- brokenCount
    missingcount INTEGER DEFAULT 0, -- missingCount
    notes TEXT,
    receivedcount INTEGER, -- receivedCount
    verifiedbroken INTEGER,
    verifiedmissing INTEGER,
    verificationnotes TEXT,
    PRIMARY KEY (transactionid, instrumentid),
    FOREIGN KEY (transactionid) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentid) REFERENCES instruments(id)
);

-- Transaction Set Items
CREATE TABLE IF NOT EXISTS transaction_set_items (
    transactionid VARCHAR(50), -- transactionId
    setid VARCHAR(50), -- setId
    quantity INTEGER NOT NULL DEFAULT 1,
    brokencount INTEGER DEFAULT 0,
    missingcount INTEGER DEFAULT 0,
    notes TEXT,
    receivedquantity INTEGER, -- receivedQuantity
    verifiedbroken INTEGER,
    verifiedmissing INTEGER,
    verificationnotes TEXT,
    PRIMARY KEY (transactionid, setid),
    FOREIGN KEY (transactionid) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (setid) REFERENCES instrument_sets(id)
);

-- 10. Logistics & Packs
CREATE TABLE IF NOT EXISTS sterile_packs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    targetunitid VARCHAR(50), -- targetUnitId
    createdat BIGINT NOT NULL, -- createdAt
    packedby VARCHAR(100), -- packedBy
    expiresat BIGINT, -- expiresAt
    qrcode VARCHAR(100) -- qrCode
);

CREATE TABLE IF NOT EXISTS sterile_pack_items (
    packid VARCHAR(50), -- packId
    instrumentid VARCHAR(50), -- instrumentId
    itemtype VARCHAR(20) DEFAULT 'SINGLE', -- itemType
    quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (packid, instrumentid),
    FOREIGN KEY (packid) REFERENCES sterile_packs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaction_packs (
    transactionid VARCHAR(50), -- transactionId
    packid VARCHAR(50), -- packId
    PRIMARY KEY (transactionid, packid),
    FOREIGN KEY (transactionid) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (packid) REFERENCES sterile_packs(id) ON DELETE CASCADE
);

-- 11. Sterilization Machine Logs
CREATE TABLE IF NOT EXISTS sterilization_batches (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    machine VARCHAR(50) NOT NULL,
    operator VARCHAR(100),
    status VARCHAR(20) DEFAULT 'SUCCESS',
    starttime BIGINT, -- startTime
    endtime BIGINT -- endTime
);

CREATE TABLE IF NOT EXISTS sterilization_batch_items (
    batchid VARCHAR(50), -- batchId
    itemid VARCHAR(50), -- itemId
    quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (batchid, itemid),
    FOREIGN KEY (batchid) REFERENCES sterilization_batches(id) ON DELETE CASCADE
);

-- 12. Requests
CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    unitid VARCHAR(50) NOT NULL, -- unitId
    status VARCHAR(20) DEFAULT 'PENDING',
    requestedby VARCHAR(100) NOT NULL, -- requestedBy
    FOREIGN KEY (unitid) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS request_items (
    requestid VARCHAR(50), -- requestId
    itemid VARCHAR(50), -- itemId
    itemtype VARCHAR(20) NOT NULL, -- itemType
    quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (requestid, itemid),
    FOREIGN KEY (requestid) REFERENCES requests(id) ON DELETE CASCADE
);

-- 13. Audit Logs
-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    userid VARCHAR(50), -- mapped from user_id in old schema, matched to app expected userId?
    -- Application expects camelCase mapping. 
    -- db.js maps 'userid' -> 'userId'.
    -- Controller queries: userId, action, entityType, entityId, severity?
    -- Table definition here has: user_id, action, entity_table, entity_id...
    -- WE NEED TO ALIGN WITH CONTROLLER.
    
    -- Let's check controller usage:
    -- "SELECT * FROM audit_logs ... "
    -- "WHERE ... action = ? ... entityType = ?"
    
    -- So controller expects columns: 'action', 'entityType', 'severity'.
    -- Current schema has: 'action', 'entity_table', 'entity_id'.
    -- Missing: 'severity', 'userName', 'entityType' (maybe entity_table is type?).
    
    -- ADJUSTING SCHEMA TO MATCH CONTROLLER NEEDS:
    username VARCHAR(100),
    action VARCHAR(100),
    entitytype VARCHAR(50), -- entityType
    entityid VARCHAR(50), -- entityId
    severity VARCHAR(20) DEFAULT 'INFO',
    details TEXT,
    ip_address VARCHAR(45),
    FOREIGN KEY (userid) REFERENCES users(id)
);

-- Legacy Logs
CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL
);

-- INITIAL DATA SEEDING
INSERT INTO units (id, name, qrcode, type) VALUES
('u1', 'IGD (Instalasi Gawat Darurat)', 'UNIT-IGD-001', 'IGD'),
('u2', 'Kamar Operasi 1 (OK)', 'UNIT-OK-001', 'OK'),
('u3', 'ICU Sentral', 'UNIT-ICU-001', 'ICU'),
('u-cssd', 'CSSD Central', 'UNIT-CSSD-001', 'CSSD')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, username, password, name, role, unitid) VALUES
('user1', 'admin', '4dm1n123', 'Kepala Instalasi', 'ADMIN', NULL),
('user2', 'staff', '4dm1n123', 'Budi (CSSD)', 'CSSD', 'u-cssd'),
('user3', 'nurse', '4dm1n123', 'Siti (Perawat)', 'NURSE', 'u2')
ON CONFLICT DO NOTHING;

INSERT INTO instruments (id, name, category, totalstock, cssdstock, dirtystock, measure_unit_id) VALUES
('i1', 'Set Bedah Mayor', 'Sets', 20, 15, 0, 'mu2'),
('i2', 'Set Bedah Minor', 'Sets', 30, 25, 0, 'mu2'),
('i3', 'Laringoskop', 'Device', 15, 10, 0, 'mu1'),
('i4', 'Gunting Bedah (Bengkok)', 'Single', 50, 40, 0, 'mu1'),
('i5', 'Pinset Anatomis', 'Single', 50, 45, 0, 'mu1')
ON CONFLICT DO NOTHING;

INSERT INTO instrument_sets (id, name, description) VALUES
('s1', 'Set Bedah Mayor', 'Perlengkapan standar untuk prosedur bedah besar.')
ON CONFLICT DO NOTHING;

INSERT INTO instrument_set_items (setid, instrumentid, quantity) VALUES
('s1', 'i4', 2),
('s1', 'i5', 2)
ON CONFLICT DO NOTHING;
