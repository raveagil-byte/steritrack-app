const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack'
};

async function recallAllStock() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        // 1. Calculate total stock in units for each instrument
        console.log('Calculating stock currently in units...');
        const [unitStocks] = await connection.query(`
            SELECT instrumentId, SUM(quantity) as totalQty 
            FROM instrument_unit_stock 
            GROUP BY instrumentId
        `);

        if (unitStocks.length === 0) {
            console.log('No stock found in units.');
            await connection.rollback();
            return;
        }

        console.log(`Found ${unitStocks.length} instruments with stock in units.`);

        // 2. Update dirtyStock for these instruments
        for (const stock of unitStocks) {
            if (stock.totalQty > 0) {
                console.log(`Moving ${stock.totalQty} items for instrument ${stock.instrumentId} to Dirty Stock...`);
                await connection.query(`
                    UPDATE instruments 
                    SET dirtyStock = dirtyStock + ? 
                    WHERE id = ?
                `, [stock.totalQty, stock.instrumentId]);
            }
        }

        // 3. Clear instrument_unit_stock table
        console.log('Clearing all unit stock records...');
        await connection.query('DELETE FROM instrument_unit_stock');
        // OR: UPDATE instrument_unit_stock SET quantity = 0? 
        // DELETE is cleaner if we want "no stock in units".

        await connection.commit();
        console.log('SUCCESS: All unit stock has been moved to Dirty Stock (CSSD).');

    } catch (error) {
        console.error('Error executing recall:', error);
        if (connection) await connection.rollback();
    } finally {
        if (connection) await connection.end();
    }
}

recallAllStock();
