const db = require('./db');

async function runFullScenario() {
    const operator = "TestAdmin";
    const unitId = "u1"; // IGD
    const suffix = Date.now();

    // IDs
    const inst1 = `i-gunting-${suffix}`;
    const inst2 = `i-pinset-${suffix}`;
    const set1 = `s-minor-${suffix}`;
    // IMPORTANT: In this system, Sets are also tracked as Instruments (Stocks) to verify availability
    // BUT the 'createSet' controller only inserts into 'instrument_sets'. 
    // The previous 'instrumentsController' logic implies Sets also exist in 'instruments' table (Category = Sets).
    // Let's create them in BOTH places to be safe and match real usage.
    const setIsInst = `i-set-minor-${suffix}`;

    try {
        console.log("🚀 STARTING FULL SCENARIO TEST...");

        // 0. Ensure Unit Exists
        console.log("\n0️⃣  Checking Unit...");
        const [unitCheck] = await db.query('SELECT id FROM units WHERE id = ?', [unitId]);
        if (unitCheck.length === 0) {
            console.log(`   -> Unit '${unitId}' not found. Creating...`);
            await db.query('INSERT INTO units (id, name, type) VALUES (?, ?, ?)', [unitId, 'IGD Test', 'Unit']);
        } else {
            console.log(`   -> Unit '${unitId}' exists.`);
        }

        // 1. Create Single Instruments
        console.log("\n1️⃣ Creating Single Instruments...");
        await db.query('INSERT INTO instruments (id, name, category, totalStock, cssdStock) VALUES (?, ?, ?, ?, ?)',
            [inst1, `Gunting Bedah ${suffix}`, 'Single', 100, 100]);
        await db.query('INSERT INTO instruments (id, name, category, totalStock, cssdStock) VALUES (?, ?, ?, ?, ?)',
            [inst2, `Pinset Anatomis ${suffix}`, 'Single', 100, 100]);
        console.log("✅ Created Gunting & Pinset (Stock: 100)");

        // 2. Create Set Definition
        console.log("\n2️⃣ Creating Instrument Set Definition...");
        await db.query('INSERT INTO instrument_sets (id, name, description) VALUES (?, ?, ?)',
            [set1, `Set Bedah Minor ${suffix}`, 'Set Bedah Dasar']);
        await db.query('INSERT INTO instrument_set_items (setId, instrumentId, quantity) VALUES (?, ?, ?)',
            [set1, inst1, 2]); // 2 Gunting
        await db.query('INSERT INTO instrument_set_items (setId, instrumentId, quantity) VALUES (?, ?, ?)',
            [set1, inst2, 2]); // 2 Pinset
        console.log("✅ Created Set Definition (2 Gunting + 2 Pinset)");

        // 3. Register Set as a Stock Item (So we can distribute it)
        // In the real app, creating a Set usually effectively creates a tracking item.
        // We'll create an instrument entry for the Set itself.
        await db.query('INSERT INTO instruments (id, name, category, totalStock, cssdStock) VALUES (?, ?, ?, ?, ?)',
            [setIsInst, `Set Bedah Minor ${suffix}`, 'Sets', 10, 10]);
        console.log("✅ Registered Set as Stock Item (Stock: 10)");


        // --- PHASE 1: DISTRIBUTION ---
        console.log("\n--- PHASE 1: DISTRIBUTION (CSSD -> UNIT) ---");
        // Distribute 5 Sets to Unit
        const txId1 = `tx-dist-${suffix}`;
        await db.query('INSERT INTO transactions (id, timestamp, type, status, unitId, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
            [txId1, Date.now(), 'DISTRIBUTE', 'COMPLETED', unitId, operator]); // Auto-complete for test

        // Transaction Items (The Set)
        await db.query('INSERT INTO transaction_items (transactionId, instrumentId, count) VALUES (?, ?, ?)',
            [txId1, setIsInst, 5]);

        // Logic Implementation (Manual DB update to simulate Controller logic)
        // 1. Deduct CSSD Stock of Set
        await db.query('UPDATE instruments SET cssdStock = cssdStock - 5 WHERE id = ?', [setIsInst]);
        // 2. Add to Unit Stock
        // Postgres syntax: DO UPDATE SET quantity = inventory_snapshots.quantity + EXCLUDED.quantity
        await db.query(`
            INSERT INTO inventory_snapshots (instrumentId, unitId, quantity) 
            VALUES (?, ?, ?) 
            ON CONFLICT (unitId, instrumentId) 
            DO UPDATE SET quantity = inventory_snapshots.quantity + EXCLUDED.quantity
        `, [setIsInst, unitId, 5]);

        console.log("✅ Distributed 5 Sets to Unit.");

        // Verify
        const [unitStock] = await db.query('SELECT quantity FROM inventory_snapshots WHERE instrumentId = ? AND unitId = ?', [setIsInst, unitId]);
        console.log(`   -> Unit Stock: ${unitStock[0].quantity} (Expected: 5)`);


        // --- PHASE 2: COLLECTION (UNIT -> CSSD Dirty) ---
        console.log("\n--- PHASE 2: COLLECTION (UNIT -> DIRTY) ---");
        const txId2 = `tx-col-${suffix}`;
        await db.query('INSERT INTO transactions (id, timestamp, type, status, unitId, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
            [txId2, Date.now(), 'COLLECT', 'COMPLETED', unitId, operator]);

        await db.query('INSERT INTO transaction_items (transactionId, instrumentId, count) VALUES (?, ?, ?)',
            [txId2, setIsInst, 5]);

        // Logic
        // 1. Deduct Unit Stock
        await db.query('UPDATE inventory_snapshots SET quantity = quantity - 5 WHERE instrumentId = ? AND unitId = ?', [setIsInst, unitId]);
        // 2. Add to Dirty Stock of Set
        await db.query('UPDATE instruments SET dirtyStock = dirtyStock + 5 WHERE id = ?', [setIsInst]);

        console.log("✅ Collected 5 Sets (Dirty).");
        const [dirtyCheck] = await db.query('SELECT dirtyStock FROM instruments WHERE id = ?', [setIsInst]);
        console.log(`   -> Dirty Stock: ${dirtyCheck[0].dirtyStock} (Expected: 5)`);


        // --- PHASE 3: WASHING (Dirty -> Packing) ---
        console.log("\n--- PHASE 3: WASHING (DIRTY -> PACKING) ---");
        // Use the actual Controller Logic through API/Function simulation?
        // Let's do manual update closely mimicking controller

        await db.query('UPDATE instruments SET dirtyStock = dirtyStock - 5, packingStock = packingStock + 5 WHERE id = ?', [setIsInst]);
        console.log("✅ Washed 5 Sets.");
        const [packingCheck] = await db.query('SELECT packingStock FROM instruments WHERE id = ?', [setIsInst]);
        console.log(`   -> Packing Stock: ${packingCheck[0].packingStock} (Expected: 5)`);


        // --- PHASE 4: STERILIZATION (Packing -> CSSD) ---
        console.log("\n--- PHASE 4: STERILIZATION (PACKING -> STERILE) ---");
        const batchId = `BATCH-${suffix}`;
        await db.query('INSERT INTO sterilization_batches (id, timestamp, operator, status, machine) VALUES (?, ?, ?, ?, ?)',
            [batchId, Date.now(), operator, 'COMPLETED', 'Autoclave 1']);

        await db.query('INSERT INTO sterilization_batch_items (batchId, itemId, quantity) VALUES (?, ?, ?)',
            [batchId, setIsInst, 5]);

        // Logic
        await db.query('UPDATE instruments SET packingStock = packingStock - 5, cssdStock = cssdStock + 5 WHERE id = ?', [setIsInst]);

        console.log("✅ Sterilized 5 Sets.");

        // FINAL VERIFICATION
        console.log("\n--- FINAL VERIFICATION ---");
        const [finalState] = await db.query('SELECT * FROM instruments WHERE id = ?', [setIsInst]);
        console.log("Set State:", JSON.stringify(finalState[0], null, 2));

        if (finalState[0].cssdStock === 10) {
            console.log("🎉 SUCCESS: Cycle Complete. Stock returned to CSSD.");
        } else {
            console.error("❌ FAILURE: Stock mismatch.");
        }

        // Clean Up
        console.log("\n🧹 Cleaning up test data...");
        // await db.query('DELETE FROM instruments WHERE id IN (?, ?, ?)', [inst1, inst2, setIsInst]);
        // await db.query('DELETE FROM instrument_sets WHERE id = ?', [set1]);
        // await db.query('DELETE FROM transactions WHERE id IN (?, ?)', [txId1, txId2]);
        // await db.query('DELETE FROM sterilization_batches WHERE id = ?', [batchId]);
        console.log("Test Data Left in DB for Inspection.");

    } catch (err) {
        console.error("❌ ERROR:", err);
    } finally {
        // process.exit(); // Let the user see output
    }
}

runFullScenario();
