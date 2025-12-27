const db = require('./db');

async function findItem() {
    try {
        console.log('Searching for Endoscope...');
        const [rows] = await db.query("SELECT * FROM instruments WHERE name LIKE '%Endoscope%'");
        console.log('Results:', rows);

        if (rows.length > 0) {
            const id = rows[0].id;
            console.log(`Checking assets for Parent ID: ${id}`);
            const [assets] = await db.query("SELECT * FROM instrument_assets WHERE instrumentid = ?", [id]);
            console.log('Assets:', assets);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

findItem();
