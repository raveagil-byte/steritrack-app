const db = require('./db');

async function runPackingSimulation() {
    const suffix = Date.now();

    // IDs
    const cleanItem = `i-clean-${suffix}`;
    const dirtyItem = `i-dirty-${suffix}`;

    try {
        console.log("🚀 STARTING PACKING STATION SIMULATION...");

        // 1. Create Item directly in CLEAN state (Ready for Packing)
        console.log("\n1️⃣ Creating 'Gunting Jaringan' (Initial: CLEAN/Bersih)...");
        await db.query(`
            INSERT INTO instruments (id, name, category, totalStock, cssdStock, dirtyStock, packingStock, measure_unit_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [cleanItem, `Gunting Jaringan (Demo) ${suffix}`, 'Single', 10, 0, 0, 10, 'mu1']);
        console.log(`✅ Created ${cleanItem} with 10 stock in PACKING.`);

        // 2. Create Item in DIRTY state
        console.log("\n2️⃣ Creating 'Klem Arteri' (Initial: DIRTY/Kotor)...");
        await db.query(`
            INSERT INTO instruments (id, name, category, totalStock, cssdStock, dirtyStock, packingStock, measure_unit_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [dirtyItem, `Klem Arteri (Demo) ${suffix}`, 'Single', 10, 0, 10, 0, 'mu1']);
        console.log(`✅ Created ${dirtyItem} with 10 stock in DIRTY.`);

        // 3. Simulate WASHING of the Dirty Item
        console.log("\n3️⃣ Simulating Washing Process (Dirty -> Packing)...");
        // Move 5 items from Dirty to Packing
        await db.query(`
            UPDATE instruments 
            SET dirtyStock = dirtyStock - 5, packingStock = packingStock + 5 
            WHERE id = ?
        `, [dirtyItem]);
        console.log(`✅ Washed 5 Klem Arteri. They should now be in PACKING.`);

        console.log("\n🎉 Simulation Data Ready!");
        console.log("👉 Please check the 'Operasional CSSD' -> 'Packing Station' page.");
        console.log("   You should see:");
        console.log(`   - Gunting Jaringan (Demo): 10 items`);
        console.log(`   - Klem Arteri (Demo): 5 items`);

    } catch (err) {
        console.error("❌ ERROR:", err);
    } finally {
        // process.exit();
    }
}

runPackingSimulation();
