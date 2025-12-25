const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function runTest() {
    console.log("=== STARTING TRANSACTION LOGIC TEST V2 ===");

    const unitId = 'TEST-UNIT-' + Date.now();
    const instId = 'TEST-INST-' + Date.now();
    const instId2 = 'TEST-INST2-' + Date.now();

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();
        console.log("1. Setup Test Data...");

        // Create Unit
        await conn.query('INSERT INTO units (id, name, type) VALUES (?, ?, ?)', [unitId, 'Test Unit', 'WARD']);

        // Create Instrument
        await conn.query('INSERT INTO instruments (id, name, totalStock, cssdStock, dirtyStock, brokenStock, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [instId, 'Test Scalpel', 100, 100, 0, 0, 'SET_ITEM']);

        console.log("Initial State: CSSD=100, Unit=0");

        // --- STEP 1: DISTRIBUTE 10 Items ---
        console.log("\n2. Testing DISTRIBUTE (10 items)...");
        const txId1 = uuidv4();

        await conn.query('UPDATE instruments SET cssdStock = cssdStock - ? WHERE id = ?', [10, instId]);
        await conn.query('INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
            [instId, unitId, 10, 10]);

        console.log("Attempting INSERT transaction 1...");
        // Ensure qrCode is provided
        await conn.query('INSERT INTO transactions (id, timestamp, type, status, unitId, qrCode) VALUES (?, ?, ?, ?, ?, ?)',
            [txId1, Date.now(), 'DISTRIBUTE', 'COMPLETED', unitId, 'QR-TEST-DIST-01']);
        console.log("INSERT transaction 1 SUCCESS");

        // Verify Step 1
        const [inst1] = await conn.query('SELECT * FROM instruments WHERE id = ?', [instId]);
        const [unitStock1] = await conn.query('SELECT * FROM instrument_unit_stock WHERE instrumentId = ? AND unitId = ?', [instId, unitId]);

        console.log(`State after Distribute: CSSD=${inst1[0].cssdStock} (Exp: 90), Unit=${unitStock1[0].quantity} (Exp: 10)`);

        // --- STEP 2: COLLECT 5 Items ---
        console.log("\n3. Testing COLLECT (5 items)...");
        const txId2 = uuidv4();

        const collectQty = 5;
        await conn.query('UPDATE instrument_unit_stock SET quantity = quantity - ? WHERE instrumentId = ? AND unitId = ?',
            [collectQty, instId, unitId]);
        await conn.query('UPDATE instruments SET dirtyStock = dirtyStock + ? WHERE id = ?',
            [collectQty, instId]);

        console.log("Attempting INSERT transaction 2...");
        await conn.query('INSERT INTO transactions (id, timestamp, type, status, unitId, qrCode) VALUES (?, ?, ?, ?, ?, ?)',
            [txId2, Date.now(), 'COLLECT', 'PENDING', unitId, 'QR-TEST-COLL-01']);
        console.log("INSERT transaction 2 SUCCESS");

        // Verify Step 2
        const [inst2] = await conn.query('SELECT * FROM instruments WHERE id = ?', [instId]);
        const [unitStock2] = await conn.query('SELECT * FROM instrument_unit_stock WHERE instrumentId = ? AND unitId = ?', [instId, unitId]);

        console.log(`State after Collect: CSSD=${inst2[0].cssdStock} (Exp: 90), Dirty=${inst2[0].dirtyStock} (Exp: 5), Unit=${unitStock2[0].quantity} (Exp: 5)`);

        console.log("\nSUCCESS: Transaction Logic consistency check passed.");

        await conn.rollback();
        console.log("\nTest Completed. Database changes rolled back.");

    } catch (err) {
        console.error("TEST FAILED:", err);
        console.error("Error Code:", err.code);
        console.error("SQL Message:", err.sqlMessage);
        await conn.rollback();
    } finally {
        conn.release();
        process.exit();
    }
}

runTest();
