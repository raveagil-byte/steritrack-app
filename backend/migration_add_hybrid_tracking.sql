-- =====================================================
-- MIGRATION: Hybrid Tracking Support (Serialized Assets)
-- Purpose: Allow mixing quantity-based items with sterilized assets
-- Date: 2024-12-11
-- =====================================================

-- 1. Add configuration flag to existing instruments table
ALTER TABLE instruments
ADD COLUMN is_serialized BOOLEAN DEFAULT FALSE COMMENT 'If true, requires specific unit selection in transactions';

-- 2. Create table for specific Instrument Assets (for High Value items)
CREATE TABLE IF NOT EXISTS instrument_assets (
    id VARCHAR(50) PRIMARY KEY, -- Internal unique ID (e.g., AST-UUID)
    instrumentId VARCHAR(50) NOT NULL,
    serialNumber VARCHAR(100) NOT NULL, -- Manufacturer SN or Hospital Asset Tag
    purchaseDate DATE,
    warrantyExpiry DATE,
    usageCount INT DEFAULT 0 COMMENT 'Increments automatically on Sterilization completion',
    maxUsageLimit INT COMMENT 'Usage limit before maintenance is required',
    status VARCHAR(20) DEFAULT 'READY', -- READY, IN_USE, MAINTENANCE, BROKEN, LOST
    notes TEXT,
    location VARCHAR(50) COMMENT 'Current physical location',
    
    createdAt BIGINT,
    updatedAt BIGINT,

    FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE,
    -- Prevent duplicate serial numbers for the same instrument type
    UNIQUE KEY unique_serial (instrumentId, serialNumber),
    INDEX idx_status (status),
    INDEX idx_serial (serialNumber)
);

-- 3. Create table to link Transactions with Specific Assets
-- This is used ONLY when the transaction item is is_serialized = TRUE
CREATE TABLE IF NOT EXISTS transaction_asset_details (
    id VARCHAR(50) PRIMARY KEY,
    transactionId VARCHAR(50) NOT NULL,
    instrumentId VARCHAR(50) NOT NULL, -- Redundant but fast for queries
    assetId VARCHAR(50) NOT NULL,
    
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentId) REFERENCES instruments(id),
    FOREIGN KEY (assetId) REFERENCES instrument_assets(id),
    
    -- Ensure an asset is only listed once per transaction
    UNIQUE KEY unique_tx_asset (transactionId, assetId)
);

-- =====================================================
-- EXAMPLE DATA (Optional - For Testing)
-- =====================================================

/*
-- 1. Set "Laringoskop" (assuming ID 'i3') as a Serialized Item
UPDATE instruments SET is_serialized = TRUE WHERE id = 'i3';

-- 2. Register specific Laringoskop assets
INSERT INTO instrument_assets (id, instrumentId, serialNumber, status, createdAt) VALUES 
('AST-LAR-001', 'i3', 'SN-OLYMPUS-X99', 'READY', UNIX_TIMESTAMP()*1000),
('AST-LAR-002', 'i3', 'SN-OLYMPUS-X100', 'READY', UNIX_TIMESTAMP()*1000);
*/
