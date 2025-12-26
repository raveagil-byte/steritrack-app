
const db = require('./db');

async function migrate() {
    console.log("Migrating: Adding Par Level (max_stock) to inventory_snapshots...");
    const conn = await db.getConnection();

    try {
        await conn.query(`
            ALTER TABLE inventory_snapshots 
            ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 100
        `);
        console.log("✅ Added 'max_stock' column to inventory_snapshots.");

        // Add audit_stock_check table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS audit_stock_checks (
                id VARCHAR(50) PRIMARY KEY,
                unit_id VARCHAR(50) NOT NULL,
                timestamp BIGINT NOT NULL,
                user_id VARCHAR(50),
                notes TEXT
            )
        `);
        console.log("✅ Created 'audit_stock_checks' table.");

        await conn.query(`
            CREATE TABLE IF NOT EXISTS audit_stock_check_items (
                audit_id VARCHAR(50),
                instrument_id VARCHAR(50),
                system_qty INT,
                physical_qty INT,
                discrepancy INT,
                PRIMARY KEY (audit_id, instrument_id),
                FOREIGN KEY (audit_id) REFERENCES audit_stock_checks(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Created 'audit_stock_check_items' table.");

    } catch (err) {
        console.error("Migration Failed:", err);
    } finally {
        conn.release();
        process.exit();
    }
}

migrate();
