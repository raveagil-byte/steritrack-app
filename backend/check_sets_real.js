const db = require('./db');

async function checkSetsReal() {
    try {
        console.log("=== CHECKING INSTRUMENT SETS ===");

        // 1. Get all sets from 'instrument_sets' (Correct table based on controller)
        const [sets] = await db.query("SELECT id, name FROM instrument_sets");

        if (sets.length === 0) {
            console.log("❌ No sets found in 'instrument_sets'.");
            process.exit();
        }

        console.log(`Found ${sets.length} sets. Checking contents...`);

        for (const set of sets) {
            console.log(`\n📦 SET: ${set.name} (ID: ${set.id})`);

            // 2. Get items
            const [items] = await db.query(`
                SELECT 
                    isi.instrumentId,
                    i.name as InstrumentName,
                    isi.quantity
                FROM instrument_set_items isi
                LEFT JOIN instruments i ON isi.instrumentId = i.id
                WHERE isi.setId = ?
            `, [set.id]);

            if (items.length > 0) {
                console.table(items.map(x => ({
                    "Instrument Name": x.InstrumentName || 'UNKNOWN ID',
                    "Qty": x.quantity
                })));
            } else {
                console.log("   ⚠️ EMPTY RECIPE (No items assigned)");
            }
        }

        process.exit();

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSetsReal();
