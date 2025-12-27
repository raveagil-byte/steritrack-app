const db = require('./db');

async function checkInstruments() {
    try {
        console.log('Checking instruments table...');
        const [rows] = await db.query('SELECT * FROM instruments');
        console.log(`Total Instruments Found: ${rows.length}`);
        if (rows.length > 0) {
            console.log(JSON.stringify(rows, null, 2));
        } else {
            console.log('Table is EMPTY.');
        }

        console.log('\nChecking instrument_assets table...');
        const [assets] = await db.query('SELECT * FROM instrument_assets');
        console.log(`Total Assets Found: ${assets.length}`);
        if (assets.length > 0) {
            console.log(JSON.stringify(assets.slice(0, 5), null, 2));
        }

        console.log('\n--- TESTING MANUAL INSERT ---');
        const testId = `test-${Date.now()}`;
        try {
            await db.query(`INSERT INTO instruments (id, name, category, totalStock) VALUES (?, ?, ?, ?)`, [testId, 'Test Item', 'Single', 10]);
            console.log(`INSERT SUCCESS: ${testId}`);

            // Verify
            const [check] = await db.query('SELECT * FROM instruments WHERE id = ?', [testId]);
            console.log('Verification:', JSON.stringify(check, null, 2));

            // Clean up
            await db.query('DELETE FROM instruments WHERE id = ?', [testId]);
            console.log('Cleanup Done.');

        } catch (e) {
            console.error('INSERT FAILED:', e.message);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkInstruments();
