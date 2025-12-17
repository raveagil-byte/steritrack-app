const db = require('./db');
const fs = require('fs');
const path = require('path');

async function exportPackData() {
    console.log("📦 Exporting Local sterile_pack_items data...");

    const connection = await db.getConnection();
    const OUTPUT_FILE = path.join(__dirname, 'restore_pack_data.sql');

    try {
        // 1. Get the data
        const [rows] = await connection.query("SELECT * FROM sterile_pack_items");

        if (rows.length === 0) {
            console.log("⚠️ No data found in sterile_pack_items. Skipping export.");
            return;
        }

        // 2. Generate INSERT statements
        let sql = "-- RESTORE DATA for sterile_pack_items\n";
        sql += "INSERT IGNORE INTO sterile_pack_items (packId, instrumentId, itemType, quantity) VALUES\n";

        const values = rows.map(row => {
            return `('${row.packId}', '${row.instrumentId}', '${row.itemType || 'SINGLE'}', ${row.quantity})`;
        });

        sql += values.join(",\n") + ";\n";

        fs.writeFileSync(OUTPUT_FILE, sql, 'utf8');
        console.log(`✅ Data Exported to: ${OUTPUT_FILE}`);
        console.log(`📊 Total Records: ${rows.length}`);
        console.log("👉 Please Import this file to your Cloud Database using HeidiSQL/DBeaver.");

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

exportPackData();
