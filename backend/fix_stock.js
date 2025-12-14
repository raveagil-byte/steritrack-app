const db = require('./db');

async function fixStock() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database...');

        // Set packingStock = 50 for i4 (Gunting) and i5 (Pinset) 
        // This simulates that they have been washed and are ready to pack
        await connection.query(`UPDATE instruments SET packingStock = 50 WHERE id IN ('i4', 'i5')`);
        console.log('Updated packingStock to 50 for i4 and i5');

        // Also set packingStock for Sets (i1, i2) just in case
        await connection.query(`UPDATE instruments SET packingStock = 10 WHERE id IN ('i1', 'i2')`);
        console.log('Updated packingStock to 10 for i1 and i2');

        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('Error fixing stock:', err);
        process.exit(1);
    }
}

fixStock();
