const db = require('./db');

async function fixStock() {
    try {
        console.log('Fixing stock...');
        await db.query("UPDATE instruments SET dirtyStock = 1 WHERE id = '1766808785924'");
        console.log('Stock updated successfully.');
    } catch (err) {
        console.error('ERROR UPDATING STOCK:', err);
    } finally {
        process.exit();
    }
}

fixStock();
