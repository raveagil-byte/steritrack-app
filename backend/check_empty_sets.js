const db = require('./db');

async function checkEmptySets() {
    try {
        console.log("=== CHECKING EMPTY SETS RECIPES ===");

        // 1. Get all sets
        const [sets] = await db.query("SELECT id, name FROM instrument_sets");

        let emptyCount = 0;
        let nonEmptyCount = 0;

        for (const set of sets) {
            // Count items in this set
            const [rows] = await db.query("SELECT count(*) as count FROM instrument_set_items WHERE setId = ?", [set.id]);
            const count = rows[0].count;

            if (count === 0) {
                console.log(`❌ [EMPTY] ${set.name} (ID: ${set.id})`);
                emptyCount++;
            } else {
                nonEmptyCount++;
            }
        }

        console.log("\n--- SUMMARY ---");
        console.log(`✅ Sets with Items: ${nonEmptyCount}`);
        console.log(`⚠️ Sets WITHOUT Items: ${emptyCount}`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkEmptySets();
