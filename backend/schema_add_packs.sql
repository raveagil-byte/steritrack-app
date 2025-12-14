
-- Sterile Packs (Containers)
CREATE TABLE IF NOT EXISTS sterile_packs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(20) NOT NULL, -- 'SET' or 'SINGLE_ITEMS'
    status VARCHAR(20) NOT NULL, -- 'PACKED', 'STERILIZED', 'DISTRIBUTED'
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
