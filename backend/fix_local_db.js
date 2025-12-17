const db = require('./db');
const fs = require('fs');
const path = require('path');

// FORCE UNSET any cloud env vars just in case
delete process.env.DB_HOST;
// db.js loads .env automatically, so we just rely on that.

async function runLocalFix() {
    console.log("🛠️  Fixing LOCAL Database Schema...");

    // We reuse the SQL we made for the cloud fix because the goal is to make them the SAME.
    // However, I will write the SQL commands directly here to be sure.
    const statements = [
        "ALTER TABLE sterilization_batches CHANGE COLUMN machineNumber machine VARCHAR(50) DEFAULT 'Autoclave 1'",
        "ALTER TABLE sterilization_batch_items CHANGE COLUMN instrumentId itemId VARCHAR(50)"
    ];

    const connection = await db.getConnection();

    try {
        console.log(`Connected to: ${connection.config.host} (Database: ${connection.config.database})`);

        for (const sql of statements) {
            console.log(`\nExecuting: ${sql}`);
            try {
                await connection.query(sql);
                console.log("✅ Success");
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log("⚠️ Skipped: Column 'machineNumber' or 'instrumentId' not found (Assuming already fixed).");
                } else if (err.code === 'ER_NO_SUCH_TABLE') {
                    console.log("⚠️ Skipped: Table does not exist.");
                } else {
                    console.error("❌ Error:", err.message);
                }
            }
        }

        console.log("\n🔍 Verification:");
        const [cols] = await connection.query("SHOW COLUMNS FROM sterilization_batch_items");
        const hasItemId = cols.some(c => c.Field === 'itemId');
        console.log(`Column 'itemId' exists? ${hasItemId ? 'YES (Correct)' : 'NO (Problem)'}`);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

runLocalFix();
