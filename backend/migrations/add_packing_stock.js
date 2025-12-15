const db = require('../db');

async function migrate() {
    console.log("Starting migration: Add packingStock to instruments...");
    try {
        const query = "ALTER TABLE instruments ADD COLUMN packingStock INT DEFAULT 0;";
        await db.query(query);
        console.log("✅ Success: packingStock column added.");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("ℹ️ Column packingStock already exists. Skipping.");
        } else {
            console.error("❌ Migration Failed:", error.message);
        }
    } finally {
        process.exit();
    }
}

migrate();
