const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack'
};

const fs = require('fs');

async function analyzeData() {
    let connection;
    const report = {
        timestamp: new Date().toISOString(),
        negativeStocks: [],
        stockMismatches: [],
        orphanSetItems: [],
        emptySets: []
    };

    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        // 1. Negative Stocks
        const [negativeStocks] = await connection.query(`
            SELECT id, name, totalStock, cssdStock, dirtyStock, packingStock, brokenStock, missingStock 
            FROM instruments 
            WHERE totalStock < 0 OR cssdStock < 0 OR dirtyStock < 0 OR packingStock < 0 OR brokenStock < 0 OR missingStock < 0
        `);
        report.negativeStocks = negativeStocks;

        // 2. Stock Consistency
        const [stockMismatch] = await connection.query(`
            SELECT i.id, i.name, i.totalStock, 
                   i.cssdStock, i.dirtyStock, i.packingStock,
                   COALESCE(SUM(u.quantity), 0) as unitStockTotal,
                   (i.cssdStock + i.dirtyStock + i.packingStock + COALESCE(SUM(u.quantity), 0)) as calculatedTotal
            FROM instruments i
            LEFT JOIN instrument_unit_stock u ON i.id = u.instrumentId
            GROUP BY i.id
            HAVING i.totalStock != calculatedTotal
        `);
        report.stockMismatches = stockMismatch;

        // 3. Orhpans
        const [orphanSetItems] = await connection.query(`
            SELECT nums.setId, nums.instrumentId 
            FROM instrument_set_items nums
            LEFT JOIN instruments i ON nums.instrumentId = i.id
            WHERE i.id IS NULL
        `);
        report.orphanSetItems = orphanSetItems;

        // 4. Empty Sets
        const [emptySets] = await connection.query(`
            SELECT s.id, s.name 
            FROM instrument_sets s
            LEFT JOIN instrument_set_items i ON s.id = i.setId
            WHERE i.instrumentId IS NULL
        `);
        report.emptySets = emptySets;

        fs.writeFileSync('analysis_result.json', JSON.stringify(report, null, 2));
        console.log('Analysis saved to analysis_result.json');

    } catch (error) {
        console.error('Error executing analysis:', error);
    } finally {
        if (connection) await connection.end();
    }
}

analyzeData();
