const db = require('./db');

async function checkDressingSet() {
    try {
        console.log("=== CHECKING DRESSING SET STATUS ===");

        // 1. Find the Set
        const [sets] = await db.query("SELECT * FROM sets WHERE name LIKE '%Dressing%' LIMIT 1");

        if (sets.length === 0) {
            console.log("❌ Dressing Set NOT FOUND in database.");

            // List available sets
            const [allSets] = await db.query("SELECT id, name FROM sets LIMIT 10");
            console.log("Available Sets:", allSets.map(s => s.name).join(", "));
            process.exit();
        }

        const dressingSet = sets[0];
        console.log(`✅ Set Found: ${dressingSet.name} (ID: ${dressingSet.id})`);

        // 2. Get Recipe (Items in Set)
        const [items] = await db.query(`
            SELECT 
                isi.instrumentId, 
                i.name, 
                isi.quantity as qtyNeeded,
                i.cssdStock as ReadyStock,
                i.dirtyStock as DirtyStock,
                i.packingStock as PackingStock
            FROM instrument_set_items isi
            JOIN instruments i ON isi.instrumentId = i.id
            WHERE isi.setId = ?
        `, [dressingSet.id]);

        if (items.length === 0) {
            console.log("⚠️ This set has NO instruments assigned (Empty Recipe).");
            process.exit();
        }

        console.log("\n--- RECIPE & STOCK STATUS ---");
        console.table(items.map(i => ({
            Instrument: i.name,
            "Qty/Set": i.qtyNeeded,
            "Ready (CSSD)": i.ReadyStock,
            "Needs Washing": i.DirtyStock,
            "Needs Sterilizing": i.PackingStock
        })));

        // 3. Analysis
        const canSendDirectly = items.every(i => i.ReadyStock >= i.qtyNeeded);

        console.log("\n--- CONCLUSION ---");
        if (canSendDirectly) {
            console.log("✅ YES, YOU CAN SEND DIRECTLY.");
            console.log("All components are available in CSSD Ready Stock.");
        } else {
            console.log("❌ NO, YOU CANNOT SEND DIRECTLY.");
            console.log("Some components are missing from Ready Stock.");
            const missing = items.filter(i => i.ReadyStock < i.qtyNeeded);
            missing.forEach(m => {
                console.log(`- ${m.name}: Need ${m.qtyNeeded}, Have ${m.ReadyStock}. Check Dirty/Packing piles.`);
            });
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkDressingSet();
