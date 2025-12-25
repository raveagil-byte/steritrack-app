const db = require('./db');

async function checkInstrumentsAsSets() {
    try {
        // Cek instrumen yang kategorinya 'SET'
        const [sets] = await db.query("SELECT id, name, cssdStock FROM instruments WHERE category = 'SET' OR name LIKE '%Set%' LIMIT 5");
        console.log("INSTRUMENTS (Sets):");
        console.log(JSON.stringify(sets));

        if (sets.length > 0) {
            // Ambil detail item dari set pertama
            const setId = sets[0].id;
            console.log("\nChecking components for Set ID:", setId);

            const [components] = await db.query(`
                SELECT 
                    isi.instrumentId, 
                    i.name, 
                    isi.quantity as qtyNeeded,
                    i.cssdStock as ReadyStock
                FROM instrument_set_items isi
                JOIN instruments i ON isi.instrumentId = i.id
                WHERE isi.setId = ?
            `, [setId]);

            console.log("COMPONENTS:");
            console.log(JSON.stringify(components));
        }

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
checkInstrumentsAsSets();
