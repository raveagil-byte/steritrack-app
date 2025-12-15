-- CREATE DATABASE IF NOT EXISTS steritrack;
-- USE steritrack;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL, -- In production, hash this!
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    unitId VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);

-- Units
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    qrCode VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE
);

-- Instruments
CREATE TABLE IF NOT EXISTS instruments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    totalStock INT NOT NULL DEFAULT 0,
    cssdStock INT NOT NULL DEFAULT 0,
    dirtyStock INT NOT NULL DEFAULT 0,
    packingStock INT NOT NULL DEFAULT 0,
    brokenStock INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Instrument Stock per Unit
CREATE TABLE IF NOT EXISTS instrument_unit_stock (
    instrumentId VARCHAR(50),
    unitId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 0,
    PRIMARY KEY (instrumentId, unitId),
    FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE,
    FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE
);

-- Instrument Sets (kits)
CREATE TABLE IF NOT EXISTS instrument_sets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Items within a Set
CREATE TABLE IF NOT EXISTS instrument_set_items (
    setId VARCHAR(50),
    instrumentId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (setId, instrumentId),
    FOREIGN KEY (setId) REFERENCES instrument_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    unitId VARCHAR(50) NOT NULL,
    qrCode VARCHAR(100),
    createdBy VARCHAR(100),
    validatedBy VARCHAR(100),
    FOREIGN KEY (unitId) REFERENCES units(id)
);

-- Transaction Items (for individual instruments)
CREATE TABLE IF NOT EXISTS transaction_items (
    transactionId VARCHAR(50),
    instrumentId VARCHAR(50),
    count INT NOT NULL,
    itemType VARCHAR(20) DEFAULT 'SINGLE',
    brokenCount INT DEFAULT 0,
    missingCount INT DEFAULT 0,
    PRIMARY KEY (transactionId, instrumentId),
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentId) REFERENCES instruments(id)
);

-- Transaction Set Items (for instrument sets)
CREATE TABLE IF NOT EXISTS transaction_set_items (
    transactionId VARCHAR(50),
    setId VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    brokenCount INT DEFAULT 0,
    missingCount INT DEFAULT 0,
    PRIMARY KEY (transactionId, setId),
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (setId) REFERENCES instrument_sets(id)
);

-- Requests (Nurse requests for instruments/sets)
CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    unitId VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    requestedBy VARCHAR(100) NOT NULL,
    FOREIGN KEY (unitId) REFERENCES units(id)
);

-- Request Items
CREATE TABLE IF NOT EXISTS request_items (
    requestId VARCHAR(50),
    itemId VARCHAR(50),
    itemType VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (requestId, itemId),
    FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
);

-- Logs
CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL
);

-- INSERT INITIAL DATA
INSERT IGNORE INTO units (id, name, qrCode, type) VALUES
('u1', 'IGD (Instalasi Gawat Darurat)', 'UNIT-IGD-001', 'IGD'),
('u2', 'Kamar Operasi 1 (OK)', 'UNIT-OK-001', 'OK'),
('u3', 'ICU Sentral', 'UNIT-ICU-001', 'ICU');

INSERT IGNORE INTO users (id, username, password, name, role, unitId) VALUES
('user1', 'admin', '4dm1n123', 'Kepala Instalasi', 'ADMIN', NULL),
('user2', 'staff', '4dm1n123', 'Budi (CSSD)', 'CSSD', NULL),
('user3', 'nurse', '4dm1n123', 'Siti (Perawat)', 'NURSE', 'u2');

INSERT IGNORE INTO instruments (id, name, category, totalStock, cssdStock, dirtyStock) VALUES
('i1', 'Set Bedah Mayor', 'Sets', 20, 15, 0),
('i2', 'Set Bedah Minor', 'Sets', 30, 25, 0),
('i3', 'Laringoskop', 'Device', 15, 10, 0),
('i4', 'Gunting Bedah (Bengkok)', 'Single', 50, 40, 0),
('i5', 'Pinset Anatomis', 'Single', 50, 45, 0);

INSERT IGNORE INTO instrument_sets (id, name, description) VALUES
('s1', 'Set Bedah Mayor', 'Perlengkapan standar untuk prosedur bedah besar.');

INSERT IGNORE INTO instrument_set_items (setId, instrumentId, quantity) VALUES
('s1', 'i4', 2),
('s1', 'i5', 2);

-- Sterile Packs (Containers)
CREATE TABLE IF NOT EXISTS sterile_packs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL, -- 'SET' or 'SINGLE_ITEMS'
    status VARCHAR(20) NOT NULL, -- 'PACKED', 'STERILIZED', 'DISTRIBUTED'
    targetUnitId VARCHAR(50),
    createdAt BIGINT NOT NULL,
    packedBy VARCHAR(100),
    expiresAt BIGINT,
    qrCode VARCHAR(100)
);

-- Items inside a Sterile Pack
CREATE TABLE IF NOT EXISTS sterile_pack_items (
    packId VARCHAR(50),
    instrumentId VARCHAR(50), -- Or setId if the pack contains a full set
    itemType VARCHAR(20) DEFAULT 'SINGLE',
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (packId, instrumentId),
    FOREIGN KEY (packId) REFERENCES sterile_packs(id) ON DELETE CASCADE
);

-- Transaction Packs (Links Packs to a Transaction)
CREATE TABLE IF NOT EXISTS transaction_packs (
    transactionId VARCHAR(50),
    packId VARCHAR(50),
    PRIMARY KEY (transactionId, packId),
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (packId) REFERENCES sterile_packs(id) ON DELETE CASCADE
);

-- Sterilization Batches (Logs machine usage)
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
