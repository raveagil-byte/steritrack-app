const db = require('../db');

async function migrate() {
    console.log("Starting migration: Create Sterilization Batches tables...");

    const table1 = `
    CREATE TABLE IF NOT EXISTS sterilization_batches (
        id VARCHAR(50) PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        machine VARCHAR(50) NOT NULL,
        operator VARCHAR(100),
        status VARCHAR(20) DEFAULT 'SUCCESS',
        startTime BIGINT,
        endTime BIGINT
    );`;

    const table2 = `
    CREATE TABLE IF NOT EXISTS sterilization_batch_items (
        batchId VARCHAR(50),
        itemId VARCHAR(50),
        quantity INT NOT NULL DEFAULT 1,
        PRIMARY KEY (batchId, itemId),
        FOREIGN KEY (batchId) REFERENCES sterilization_batches(id) ON DELETE CASCADE
    );`;

    try {
        await db.query(table1);
        console.log("✅ Created 'sterilization_batches' table.");

        await db.query(table2);
        console.log("✅ Created 'sterilization_batch_items' table.");

    } catch (error) {
        console.error("❌ Migration Failed:", error.message);
    } finally {
        process.exit();
    }
}

migrate();
