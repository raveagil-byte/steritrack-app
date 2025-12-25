const db = require('./db');

async function checkSetsRealJson() {
    try {
        const [sets] = await db.query("SELECT id, name FROM instrument_sets");
        const result = [];

        for (const set of sets) {
            const [items] = await db.query(`
                SELECT isi.quantity, i.name 
                FROM instrument_set_items isi 
                LEFT JOIN instruments i ON isi.instrumentId = i.id 
                WHERE isi.setId = ?`, [set.id]);
            result.push({
                set: set.name,
                items: items
            });
        }
        console.log("SETS DATA:");
        console.log(JSON.stringify(result));
        process.exit();

    } catch (e) { console.error(e); process.exit(1); }
}
checkSetsRealJson();
