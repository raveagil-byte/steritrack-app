const db = require('./db');

async function debugCalculation() {
    try {
        console.log("--- Fetching Data ---");
        const [instruments] = await db.query('SELECT * FROM instruments');
        const [sets] = await db.query('SELECT id, name FROM instrument_sets');
        const [recipes] = await db.query('SELECT * FROM instrument_set_items');

        console.log(`Instruments: ${instruments.length}`);
        console.log(`Sets (Definitions): ${sets.length}`);
        console.log(`Recipes (Items): ${recipes.length}`);

        // 1. Map Set Definition ID -> Set Name
        const setNames = {};
        sets.forEach(s => setNames[s.id] = s.name);

        // Print sample set names
        console.log("\n--- Set Definitions (Sample) ---");
        Object.entries(setNames).slice(0, 5).forEach(([id, name]) => console.log(`${id}: ${name}`));

        // 2. Map Set Name -> Set Total Stock (from instruments table)
        const setStocks = {};
        const setInstruments = instruments.filter(i => i.category === 'Sets');
        console.log(`\n--- Instruments with category='Sets': ${setInstruments.length} ---`);

        setInstruments.forEach(i => {
            setStocks[i.name] = i.totalStock;
            console.log(`Set Instrument: "${i.name}" -> Stock: ${i.totalStock}`);
        });

        // 3. Calculate Usage
        console.log("\n--- Calculating Usage ---");
        const instrumentUsage = {}; // instrumentId -> count

        recipes.forEach(r => {
            const setName = setNames[r.setId];
            if (setName) {
                const parentStock = setStocks[setName];

                if (parentStock === undefined) {
                    console.warn(`WARNING: Recipe for Set "${setName}" (ID: ${r.setId}) found, but no matching 'Sets' instrument found in 'instruments' table with that name.`);
                } else {
                    const usage = r.quantity * parentStock;
                    instrumentUsage[r.instrumentId] = (instrumentUsage[r.instrumentId] || 0) + usage;
                    // console.log(`   Item ${r.instrumentId} used in "${setName}" (Qty: ${r.quantity} * Stock: ${parentStock} = ${usage})`);
                }
            } else {
                console.warn(`WARNING: Recipe references unknown SetID: ${r.setId}`);
            }
        });

        console.log("\n--- Usage Results (Sample) ---");
        Object.entries(instrumentUsage).slice(0, 10).forEach(([id, used]) => {
            const inst = instruments.find(i => i.id === id);
            console.log(`Instrument "${inst ? inst.name : 'Unknown'}" (ID: ${id}) -> Used: ${used}`);
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        // process.exit();
    }
}

debugCalculation();
