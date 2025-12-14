const db = require('./db');

async function fixCategories() {
    try {
        console.log("Fixing categories...");

        // Find all instruments that match a Set Name
        const [sets] = await db.query('SELECT name FROM instrument_sets');
        console.log(`Found ${sets.length} sets.`);

        let updated = 0;
        for (const set of sets) {
            const [res] = await db.query(
                'UPDATE instruments SET category = "Sets" WHERE name = ? AND category != "Sets"',
                [set.name]
            );
            if (res.changedRows > 0) {
                console.log(`Updated category for "${set.name}" to 'Sets'`);
                updated++;
            }
        }

        console.log(`\nUpdated ${updated} instruments.`);

    } catch (err) {
        console.error(err);
    } finally {
        // process.exit();
    }
}

fixCategories();
