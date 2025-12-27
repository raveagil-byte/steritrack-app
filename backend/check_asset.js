const db = require('./db');

async function checkAsset() {
    try {
        const itemId = 'i-1766760854045';

        console.log(`Checking instruments table for ${itemId}...`);
        const [instRows] = await db.query('SELECT * FROM instruments WHERE id = ?', [itemId]);
        console.log('Instruments Table Match:', instRows.length);

        console.log(`Checking instrument_assets table for ${itemId}...`);
        const [assetRows] = await db.query('SELECT * FROM instrument_assets WHERE id = ?', [itemId]);
        console.log('Assets Table Match:', JSON.stringify(assetRows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkAsset();
