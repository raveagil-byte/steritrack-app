const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function runTest() {
    console.log("=== STARTING TRANSACTION LOGIC TEST V3 ===");
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();
        console.log("Transaction Started");

        const txId1 = uuidv4();
        const unitId = 'Manual-Unit-V3-' + Date.now();

        console.log("1. Creating Unit...");
        await conn.query(`INSERT IGNORE INTO units (id, name, type) VALUES (?, 'ManUnit', 'WARD')`, [unitId]);

        console.log("2. Inserting Transaction (No items logic yet)...");
        // Explicitly naming columns including qrCode
        await conn.query('INSERT INTO transactions (id, timestamp, type, status, unitId, qrCode) VALUES (?, ?, ?, ?, ?, ?)',
            [txId1, Date.now(), 'DISTRIBUTE', 'COMPLETED', unitId, 'QR-TEST-V3']);

        console.log("Insert Transaction SUCCESS");

        await conn.rollback();
        console.log("Rolled back.");

    } catch (err) {
        console.error("TEST FAILED:", err);
        await conn.rollback();
    } finally {
        conn.release();
        process.exit();
    }
}

runTest();
