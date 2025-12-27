-- Migration: Add Transaction Item Assets for Serialization Support

-- 1. Create table to link specific assets to transaction items
CREATE TABLE IF NOT EXISTS transaction_item_assets (
    transactionid VARCHAR(50) NOT NULL,
    instrumentid VARCHAR(50) NOT NULL,
    assetid VARCHAR(50) NOT NULL,
    PRIMARY KEY (transactionid, instrumentid, assetid),
    FOREIGN KEY (transactionid) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentid) REFERENCES instruments(id),
    FOREIGN KEY (assetid) REFERENCES instrument_assets(id)
);

-- 2. Add last_transaction_id to instrument_assets for easier status tracking
ALTER TABLE instrument_assets ADD COLUMN IF NOT EXISTS last_transaction_id VARCHAR(50);
ALTER TABLE instrument_assets ADD CONSTRAINT fk_last_tx FOREIGN KEY (last_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
