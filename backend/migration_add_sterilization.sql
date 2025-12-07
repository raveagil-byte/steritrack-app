-- Add packingStock to instruments to track items being washed/packed
ALTER TABLE instruments ADD COLUMN packingStock INT NOT NULL DEFAULT 0;

-- Optional: Create a table for sterilization batches if we want to log the process
CREATE TABLE IF NOT EXISTS sterilization_batches (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    operator VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'COMPLETED', -- COMPLETED
    machineNumber VARCHAR(50) DEFAULT 'Autoclave 1'
);

CREATE TABLE IF NOT EXISTS sterilization_batch_items (
    batchId VARCHAR(50),
    instrumentId VARCHAR(50),
    quantity INT NOT NULL,
    PRIMARY KEY (batchId, instrumentId),
    FOREIGN KEY (batchId) REFERENCES sterilization_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (instrumentId) REFERENCES instruments(id)
);
