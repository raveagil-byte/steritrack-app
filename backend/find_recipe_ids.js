const db = require('./db');

async function findIds() {
    try {
        console.log("=== FINDING IDs FOR RECIPE UPDATE ===");

        // 1. Find DRESSING SET ID
        const [sets] = await db.query("SELECT id, name FROM instrument_sets WHERE name LIKE '%Dressing%' LIMIT 1");
        if (sets.length === 0) {
            console.log("❌ Dressing Set NOT FOUND.");
            process.exit(1);
        }
        const setId = sets[0].id;
        console.log(`SET: ${sets[0].name} (ID: ${setId})`);

        // 2. Find Component IDs
        const itemsToFind = [
            'Bak Instrumen', // Sedang?
            'Gunting Littauer',
            'Kom', // Kecil?
            'Pinset Anatomis',
            'Pinset Cirurgis' // Check spelling: Cirurgis vs Cirugis
        ];

        const itemMap = {};

        for (const name of itemsToFind) {
            const [insts] = await db.query(`SELECT id, name FROM instruments WHERE name LIKE ?`, [`%${name}%`]);
            if (insts.length > 0) {
                console.log(`FOUND '${name}':`);
                insts.forEach(i => console.log(`  - [${i.id}] ${i.name}`));
            } else {
                console.log(`❌ NOT FOUND: '${name}'`);
            }
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
findIds();
