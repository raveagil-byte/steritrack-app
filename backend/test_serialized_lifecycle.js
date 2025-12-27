const db = require('./db');

async function runSerializedTest() {
    const operator = "TestAdmin";
    const unitId = "u1";
    const suffix = Date.now();

    // IDs
    const instId = `i-serial-drill-${suffix}`;

    try {
        console.log("🚀 STARTING SERIALIZED ITEM LIFECYCLE TEST...");

        // 0. Ensure Unit
        await db.query(`INSERT INTO units (id, name, type) VALUES ('${unitId}', 'IGD Test', 'Unit') ON CONFLICT DO NOTHING`);

        // 1. Create Serialized Instrument (Master)
        console.log("\n1️⃣ Creating Serialized Instrument (Bone Drill)...");
        await db.query(`
            INSERT INTO instruments (id, name, category, totalStock, cssdStock, is_serialized) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [instId, `Bone Drill ${suffix}`, 'Device', 3, 3, true]);

        // 2. Generate 3 Assets (Simulating Controller Logic)
        const asset1 = `asset-${suffix}-1`;
        const sn1 = `SN-DRILL-${suffix}-001`;

        await db.query(`
            INSERT INTO instrument_assets (id, instrumentid, serialnumber, status, location) 
            VALUES (?, ?, ?, ?, ?)
        `, [asset1, instId, sn1, 'READY', 'CSSD']);

        await db.query(`INSERT INTO instrument_assets (id, instrumentid, serialnumber, status, location) VALUES (?, ?, ?, ?, ?)`, [`asset-${suffix}-2`, instId, `SN-002`, 'READY', 'CSSD']);
        await db.query(`INSERT INTO instrument_assets (id, instrumentid, serialnumber, status, location) VALUES (?, ?, ?, ?, ?)`, [`asset-${suffix}-3`, instId, `SN-003`, 'READY', 'CSSD']);

        console.log(`✅ Created Master Item & 3 Assets (SN-001, SN-002, SN-003)`);
        console.log(`   Tracking Target: [${sn1}] (ID: ${asset1})`);


        // --- PHASE 1: DISTRIBUTION (CSSD -> UNIT) ---
        console.log("\n--- PHASE 1: DISTRIBUTION (Scan QR Code) ---");
        // Transaction
        const txId1 = `tx-dist-${suffix}`;
        await db.query('INSERT INTO transactions (id, timestamp, type, status, unitId, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
            [txId1, Date.now(), 'DISTRIBUTE', 'COMPLETED', unitId, operator]);

        // Transaction Item (Using Asset ID, NOT Master ID for Serialized Items usually, OR Master ID with list of Serial numbers?)
        // In this system, transaction_items stores Master ID + Count.
        // But for serialized tracking, we need to know WHICH assets.
        // Usually, there's a separate mapping or `transaction_items` might handle specific logic.
        // Assuming we just update the Asset Status directly for now as per current hybrid logic.

        // Logic:
        // 1. Update Asset Status
        await db.query(`UPDATE instrument_assets SET status = 'DISTRIBUTED', location = ? WHERE id = ?`, [unitId, asset1]);

        // 2. Update Master Stock
        await db.query(`UPDATE instruments SET cssdStock = cssdStock - 1 WHERE id = ?`, [instId]);

        // 3. Update Unit Stock Cache
        await db.query(`
            INSERT INTO inventory_snapshots (instrumentId, unitId, quantity) 
            VALUES (?, ?, 1) 
            ON CONFLICT (unitId, instrumentId) 
            DO UPDATE SET quantity = inventory_snapshots.quantity + 1
        `, [instId, unitId]);

        console.log(`✅ Distributed [${sn1}] to Unit.`);

        // Verify
        const [assetCheck1] = await db.query('SELECT status, location FROM instrument_assets WHERE id = ?', [asset1]);
        console.log(`   -> Asset Status: ${assetCheck1[0].status} @ ${assetCheck1[0].location} (Expected: DISTRIBUTED @ u1)`);


        // --- PHASE 2: COLLECTION (UNIT -> DIRTY) ---
        console.log("\n--- PHASE 2: COLLECTION (Scan QR Code) ---");

        // Logic:
        // 1. Update Asset Status
        await db.query(`UPDATE instrument_assets SET status = 'DIRTY', location = 'CSSD' WHERE id = ?`, [asset1]);

        // 2. Update Master Stock
        await db.query(`UPDATE instruments SET dirtyStock = dirtyStock + 1 WHERE id = ?`, [instId]);

        // 3. Deduct Unit Stock
        await db.query(`UPDATE inventory_snapshots SET quantity = quantity - 1 WHERE instrumentId = ? AND unitId = ?`, [instId, unitId]);

        console.log(`✅ Collected [${sn1}] as DIRTY.`);
        const [assetCheck2] = await db.query('SELECT status, location FROM instrument_assets WHERE id = ?', [asset1]);
        console.log(`   -> Asset Status: ${assetCheck2[0].status} @ ${assetCheck2[0].location}`);


        // --- PHASE 3: WASHING (DIRTY -> PACKING) ---
        console.log("\n--- PHASE 3: WASHING (Processing) ---");

        // Logic:
        await db.query(`UPDATE instrument_assets SET status = 'CLEAN', location = 'CSSD' WHERE id = ?`, [asset1]);
        await db.query(`UPDATE instruments SET dirtyStock = dirtyStock - 1, packingStock = packingStock + 1 WHERE id = ?`, [instId]);

        console.log(`✅ Washed [${sn1}]. Now CLEAN/PACKING.`);


        // --- PHASE 4: STERILIZATION (PACKING -> READY) ---
        console.log("\n--- PHASE 4: STERILIZATION (Autoclave) ---");

        // Logic:
        await db.query(`UPDATE instrument_assets SET status = 'READY', location = 'CSSD' WHERE id = ?`, [asset1]);
        await db.query(`UPDATE instruments SET packingStock = packingStock - 1, cssdStock = cssdStock + 1 WHERE id = ?`, [instId]);

        console.log(`✅ Sterilized [${sn1}]. Now READY.`);

        // FINAL CHECK
        console.log("\n--- FINAL SUMMARY ---");
        const [finalAsset] = await db.query('SELECT * FROM instrument_assets WHERE id = ?', [asset1]);
        const [finalMaster] = await db.query('SELECT * FROM instruments WHERE id = ?', [instId]);

        console.log("Asset State:", JSON.stringify(finalAsset[0], null, 2));
        console.log("Master Stock (Total 3):", {
            total: finalMaster[0].totalStock,
            cssd: finalMaster[0].cssdStock,
            dirty: finalMaster[0].dirtyStock
        });

        if (finalAsset[0].status === 'READY' && finalMaster[0].cssdStock === 3) {
            console.log("🎉 SUCCESS: Serialized Item Cycle Complete.");
        } else {
            console.log("❌ FAILURE: State mismatch.");
        }

    } catch (err) {
        console.error("❌ ERROR:", err);
    }
}

runSerializedTest();
