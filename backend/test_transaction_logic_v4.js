const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function runTest() {
    console.log("=== STARTING TRANSACTION LOGIC TEST V4 ===");
    const conn = await db.getConnection();
    const instId = 'TEST-INST-V4-' + Date.now();

    try {
        await conn.beginTransaction();
        console.log("Transaction Started");

        // Create instrument to update
        await conn.query('INSERT INTO instruments (id, name, totalStock, cssdStock, dirtyStock, brokenStock) VALUES (?, ?, ?, ?, ?, ?)',
            [instId, 'Test V4', 100, 100, 0, 0]);

        console.log("1. Updating Instrument (Trigger Check)...");
        await conn.query('UPDATE instruments SET cssdStock = cssdStock - 10 WHERE id = ?', [instId]);
        console.log("Update Success");

        const txId1 = uuidv4();
        const unitId = 'Manual-Unit-V4-' + Date.now();
        await conn.query(`INSERT IGNORE INTO units (id, name, type) VALUES (?, 'ManUnit', 'WARD')`, [unitId]);

        console.log("2. Inserting Transaction...");
        await conn.query('INSERT INTO transactions (id, timestamp, type, status, unitId, qrCode) VALUES (?, ?, ?, ?, ?, ?)',
            [txId1, Date.now(), 'DISTRIBUTE', 'COMPLETED', unitId, 'QR-TEST-V4']);

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
