const db = require('./db');

async function createMissingTable() {
    try {
        console.log("Creating 'inventory_snapshots' table...");
        const query = `
            CREATE TABLE IF NOT EXISTS inventory_snapshots (
                unitId VARCHAR(50),
                instrumentId VARCHAR(50),
                quantity INT NOT NULL DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (unitId, instrumentId),
                FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE CASCADE,
                FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE
            );
        `;
        await db.query(query);
        console.log("✅ Table 'inventory_snapshots' created/verified.");

    } catch (err) {
        console.error("❌ Error creating table:", err.message);
    } finally {
        process.exit();
    }
}

createMissingTable();
