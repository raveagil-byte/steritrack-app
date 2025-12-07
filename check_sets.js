const db = require('./backend/db');

async function checkSets() {
    try {
        const [sets] = await db.query('SELECT * FROM instrument_sets');
        console.log('Sets found:', sets.length);

        for (const set of sets) {
            console.log(`\nSet: ${set.name} (${set.id})`);
            const [items] = await db.query(`
                SELECT i.name, isi.quantity 
                FROM instrument_set_items isi 
                JOIN instruments i ON isi.instrumentId = i.id 
                WHERE isi.setId = ?
            `, [set.id]);

            if (items.length === 0) {
                console.log('  No items in this set.');
            } else {
                items.forEach(item => {
                    console.log(`  - ${item.name}: ${item.quantity}`);
                });
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkSets();
