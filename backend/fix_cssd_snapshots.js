
const db = require('./db');

async function fixSnapshots() {
    console.log("=== FIXING INVENTORY SNAPSHOTS (CSSD) ===");
    const conn = await db.getConnection();
    try {
        // 1. Get CSSD Unit ID
        // Usually 'u-cssd' or search by type 'CSSD'
        const [rows] = await conn.query("SELECT id FROM units WHERE type='CSSD'");
        const cssdUnitId = rows[0]?.id || 'u-cssd';
        console.log("CSSD Unit ID:", cssdUnitId);

        // 2. Initialise Snapshots from Instruments Table
        console.log("Syncing instruments.cssdStock -> inventory_snapshots...");

        // This query inserts or updates snapshots for the CSSD unit
        // converting 'cssdStock' column to a snapshot row
        await conn.query(`
            INSERT INTO inventory_snapshots (instrumentId, unitId, quantity)
            SELECT id, $1, cssdStock 
            FROM instruments 
            WHERE cssdStock > 0
            ON CONFLICT (instrumentId, unitId) 
            DO UPDATE SET quantity = EXCLUDED.quantity
        `, [cssdUnitId]);

        console.log("✅ CSSD Snapshots Synced.");

        // We can also initialize other units with 0 if we want them to show up explicitly,
        // but the code handles missing keys as 0 anyway.

    } catch (err) {
        console.error("❌ FIX FAILED:", err.message);
    } finally {
        conn.release();
        process.exit();
    }
}

fixSnapshots();
