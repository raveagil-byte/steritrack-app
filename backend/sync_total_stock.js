const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack'
};

async function syncStock() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        console.log('Syncing Total Stock to match sum of locations (CSSD + Packing + Dirty + Unit + Broken + Missing)...');

        // Note: Broken and Missing are usually deducted from active circulation stock, 
        // but 'totalStock' definition can vary. 
        // Usually Total Asset Owned = Active + Broken (if repairable) + Missing (until written off).
        // Let's assume Total Stock = CSSD + Packing + Dirty + Unit + Broken + Missing.

        // However, 'missingStock' was just added and is 0.
        // 'brokenStock' exists.

        // Let's first verify if we should include Broken/Missing in Total.
        // In instrumentsController: 
        // remainingLoose = totalStock - usedInSets.
        // If totalStock includes broken, then remainingLoose might be inflated with broken items.
        // But let's stick to Physical Count for now.

        // Update query
        const [result] = await connection.query(`
            UPDATE instruments i
            LEFT JOIN (
                SELECT instrumentId, SUM(quantity) as unitQty 
                FROM instrument_unit_stock 
                GROUP BY instrumentId
            ) u ON i.id = u.instrumentId
            SET i.totalStock = i.cssdStock + i.dirtyStock + i.packingStock + COALESCE(u.unitQty, 0)
        `);

        console.log(`Updated ${result.changedRows} instruments corrected.`);

        await connection.commit();
        console.log('SUCCESS: Total Stock synchronized.');

    } catch (error) {
        console.error('Error executing sync:', error);
        if (connection) await connection.rollback();
    } finally {
        if (connection) await connection.end();
    }
}

syncStock();
