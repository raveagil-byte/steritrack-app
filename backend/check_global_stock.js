const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack'
};

async function checkStock() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.query(`
            SELECT 
                SUM(totalStock) as total,
                SUM(cssdStock) as sterile,
                SUM(dirtyStock) as dirty,
                SUM(packingStock) as packing,
                SUM(brokenStock) as broken
            FROM instruments
        `);

        console.log('--- GLOBAL STOCK SUMMARY ---');
        console.table(rows);

        const [unitRows] = await connection.query(`SELECT COUNT(*) as count FROM instrument_unit_stock`);
        console.log(`Rows in instrument_unit_stock: ${unitRows[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        if (connection) await connection.end();
    }
}

checkStock();
