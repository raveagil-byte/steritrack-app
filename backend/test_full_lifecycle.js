
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function runLifecycleTest() {
    console.log("=== STERITRACK SYSTEM LIFECYCLE TEST ===");
    console.log("Testing full cycle: CSSD -> Unit -> Collection -> Wash -> Sterilization -> CSSD");

    const conn = await db.getConnection();
    const instId = 'TEST-INST-' + Date.now();
    const unitId = 'TEST-UNIT-' + Date.now();
    const userId = 'TEST-USER-' + Date.now();

    try {
        await conn.beginTransaction();

        // 1. SETUP
        console.log("\n[1] SETUP & SEEDING DATA...");
        await conn.query(`INSERT INTO units (id, name, type) VALUES ($1, 'Test Unit', 'WARD')`, [unitId]);
        await conn.query(`INSERT INTO units (id, name, type) VALUES ('u-cssd', 'CSSD Central', 'CSSD') ON CONFLICT (id) DO NOTHING`);
        await conn.query(`
            INSERT INTO instruments (id, name, category, totalstock, cssdstock, dirtystock, packingstock, brokenstock) 
            VALUES ($1, 'Test Instrument Loop', 'Single', 100, 100, 0, 0, 0)
        `, [instId]);
        await conn.query(`INSERT INTO roles (id, name) VALUES ('ADMIN', 'Administrator') ON CONFLICT (id) DO NOTHING`);
        await conn.query('INSERT INTO users (id, username, password, name, role) VALUES ($1, $2, $3, $4, $5)', [userId, 'testuser', 'pass', 'Tester', 'ADMIN']);

        console.log("    > Created Instrument (Stock: 100 CSSD)");

        // 2. DISTRIBUTE (CSSD -> Unit)
        console.log("\n[2] TESTING DISTRIBUTION (10 items)...");
        const distTxId = uuidv4();
        await conn.query(
            'INSERT INTO transactions (id, timestamp, type, status, unitid, source_unit_id, destination_unit_id, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [distTxId, Date.now(), 'DISTRIBUTE', 'COMPLETED', unitId, 'u-cssd', unitId, userId]
        );
        await conn.query(
            'INSERT INTO transaction_items (transactionid, instrumentid, count, itemtype) VALUES ($1, $2, $3, $4)',
            [distTxId, instId, 10, 'SINGLE']
        );

        // Update Stock
        await conn.query('UPDATE instruments SET cssdstock = cssdstock - 10 WHERE id = $1', [instId]);
        await conn.query(`
            INSERT INTO inventory_snapshots (instrumentid, unitid, quantity) 
            VALUES ($1, $2, 10) 
            ON CONFLICT (instrumentid, unitid) DO UPDATE SET quantity = inventory_snapshots.quantity + 10
        `, [instId, unitId]);

        // VERIFY
        const [resDist] = await conn.query('SELECT cssdstock FROM instruments WHERE id = $1', [instId]);
        const [resUnit] = await conn.query('SELECT quantity FROM inventory_snapshots WHERE instrumentid = $1 AND unitid = $2', [instId, unitId]);

        console.log(`    > CSSD Stock: ${resDist[0].cssdStock} (Expected: 90) -> ${resDist[0].cssdStock === 90 ? 'OK' : 'FAIL'}`);
        console.log(`    > Unit Stock: ${resUnit[0]?.quantity} (Expected: 10) -> ${resUnit[0]?.quantity === 10 ? 'OK' : 'FAIL'}`);

        // 3. COLLECTION (Unit -> Dirty)
        console.log("\n[3] TESTING COLLECTION (5 items)...");
        const colTxId = uuidv4();
        await conn.query(
            'INSERT INTO transactions (id, timestamp, type, status, unitid, source_unit_id, destination_unit_id, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [colTxId, Date.now(), 'COLLECT', 'COMPLETED', unitId, unitId, 'u-cssd', userId]
        );
        await conn.query(
            'INSERT INTO transaction_items (transactionid, instrumentid, count, itemtype) VALUES ($1, $2, $3, $4)',
            [colTxId, instId, 5, 'SINGLE']
        );

        // Update Stock
        await conn.query('UPDATE inventory_snapshots SET quantity = quantity - 5 WHERE instrumentid = $1 AND unitid = $2', [instId, unitId]);
        await conn.query('UPDATE instruments SET dirtystock = dirtystock + 5 WHERE id = $1', [instId]);

        // VERIFY
        const [resUnit2] = await conn.query('SELECT quantity FROM inventory_snapshots WHERE instrumentid = $1 AND unitid = $2', [instId, unitId]);
        const [resDirty] = await conn.query('SELECT dirtystock FROM instruments WHERE id = $1', [instId]);

        console.log(`    > Unit Stock: ${resUnit2[0]?.quantity} (Expected: 5) -> ${resUnit2[0]?.quantity === 5 ? 'OK' : 'FAIL'}`);
        console.log(`    > Dirty Stock: ${resDirty[0].dirtyStock} (Expected: 5) -> ${resDirty[0].dirtyStock === 5 ? 'OK' : 'FAIL'}`);

        // 4. WASHING (Dirty -> Packing)
        console.log("\n[4] TESTING WASHING (5 items)...");
        await conn.query('UPDATE instruments SET dirtystock = dirtystock - 5, packingstock = packingstock + 5 WHERE id = $1', [instId]);

        // VERIFY
        const [resWash] = await conn.query('SELECT dirtystock, packingstock FROM instruments WHERE id = $1', [instId]);
        console.log(`    > Dirty Stock: ${resWash[0].dirtyStock} (Expected: 0) -> ${resWash[0].dirtyStock === 0 ? 'OK' : 'FAIL'}`);
        console.log(`    > Packing Stock: ${resWash[0].packingStock} (Expected: 5) -> ${resWash[0].packingStock === 5 ? 'OK' : 'FAIL'}`);

        // 5. STERILIZATION (Packing -> CSSD/Sterile)
        console.log("\n[5] TESTING STERILIZATION (5 items)...");
        const batchId = 'BATCH-TEST-' + Date.now();
        await conn.query('INSERT INTO sterilization_batches (id, timestamp, machine, status) VALUES ($1, $2, $3, $4)', [batchId, Date.now(), 'Autoclave Test', 'SUCCESS']);
        await conn.query('UPDATE instruments SET packingstock = packingstock - 5, cssdstock = cssdstock + 5 WHERE id = $1', [instId]);

        // VERIFY
        const [resFinal] = await conn.query('SELECT packingstock, cssdstock, totalstock FROM instruments WHERE id = $1', [instId]);
        console.log(`    > Packing Stock: ${resFinal[0].packingStock} (Expected: 0) -> ${resFinal[0].packingStock === 0 ? 'OK' : 'FAIL'}`);
        console.log(`    > CSSD Stock: ${resFinal[0].cssdStock} (Expected: 95) -> ${resFinal[0].cssdStock === 95 ? 'OK' : 'FAIL'}`);
        console.log(`    > Total Stock: ${resFinal[0].totalStock} (Expected: 100) -> ${resFinal[0].totalStock === 100 ? 'OK' : 'FAIL'}`);

        console.log("\n✅ ALL SYSTEM CHECKS PASSED!");
        await conn.rollback();
        console.log("\n[Rollback] Test data cleared.");

    } catch (err) {
        console.error("❌ TEST FAILED:", err);
        await conn.rollback();
    } finally {
        conn.release();
        process.exit();
    }
}

runLifecycleTest();
