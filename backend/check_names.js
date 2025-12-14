const db = require('./db');

async function checkNames() {
    try {
        const [sets] = await db.query('SELECT name FROM instrument_sets ORDER BY name');
        const [insts] = await db.query('SELECT name FROM instruments WHERE category = "Sets" ORDER BY name');

        console.log(`\nSets Definitions (${sets.length}):`);
        sets.forEach(s => console.log(`  "${s.name}"`));

        console.log(`\nInstruments (Category=Sets) (${insts.length}):`);
        insts.forEach(i => console.log(`  "${i.name}"`));

        // Find mismatches
        const setNames = new Set(sets.map(s => s.name));
        const instNames = new Set(insts.map(i => i.name));

        console.log("\n--- Mismatches ---");
        sets.forEach(s => {
            if (!instNames.has(s.name)) console.log(`Missing Instrument for Set: "${s.name}"`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        // process.exit();
    }
}

checkNames();
