const db = require('./db');

async function runSerializedPackingTest() {
    const suffix = Date.now();

    // IDs
    const masterId = `i-endo-${suffix}`;

    try {
        console.log("🚀 STARTING SERIALIZED PACKING SIMULATION...");

        // 1. Create Serialized Master Instrument
        console.log("\n1️⃣ Creating 'Endoscope Flexible' (Serialized)...");
        // We set totalStock=3, packingStock=2, dirtyStock=1
        await db.query(`
            INSERT INTO instruments (id, name, category, totalStock, cssdStock, dirtyStock, packingStock, measure_unit_id, is_serialized) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [masterId, `Endoscope Flexible (Demo) ${suffix}`, 'Device', 3, 0, 1, 2, 'mu1', true]);

        // 2. Create Assets (Serial Numbers)
        // Asset 1 & 2 are CLEAN (Ready to Pack)
        console.log("2️⃣ Registering Serial Numbers...");
        await db.query(`
            INSERT INTO instrument_assets (id, instrumentid, serialnumber, status, location) 
            VALUES (?, ?, ?, ?, ?)
        `, [`ast-${suffix}-1`, masterId, `SN-ENDO-${suffix}-01`, 'CLEAN', 'CSSD']); // Ready

        await db.query(`
            INSERT INTO instrument_assets (id, instrumentid, serialnumber, status, location) 
            VALUES (?, ?, ?, ?, ?)
        `, [`ast-${suffix}-2`, masterId, `SN-ENDO-${suffix}-02`, 'CLEAN', 'CSSD']); // Ready

        // Asset 3 is DIRTY (Not yet ready)
        await db.query(`
            INSERT INTO instrument_assets (id, instrumentid, serialnumber, status, location) 
            VALUES (?, ?, ?, ?, ?)
        `, [`ast-${suffix}-3`, masterId, `SN-ENDO-${suffix}-03`, 'DIRTY', 'CSSD']);

        console.log(`✅ Created Master Item: ${masterId}`);
        console.log(`   - SN-01: CLEAN (In Packing Station)`);
        console.log(`   - SN-02: CLEAN (In Packing Station)`);
        console.log(`   - SN-03: DIRTY (Needs Washing)`);

        console.log("\n🎉 Status:");
        console.log("👉 Go to 'Packing Station'. You should see 'Endoscope Flexible (Demo)' with Stock: 2.");
        console.log("👉 NOTE: Currently the Packing App counts the 'Master Stock'.");
        console.log("   Since is_serialized=true, this item is tracked individually.");

    } catch (err) {
        console.error("❌ ERROR:", err);
    }
}

runSerializedPackingTest();
