const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack'
};

async function migrateSchema() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        console.log('Checking for missing columns in instruments table...');

        // Check columns
        const [columns] = await connection.query(`SHOW COLUMNS FROM instruments`);
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('packingStock')) {
            console.log('Adding packingStock column...');
            await connection.query(`ALTER TABLE instruments ADD COLUMN packingStock INT NOT NULL DEFAULT 0 AFTER dirtyStock`);
        } else {
            console.log('packingStock column exists.');
        }

        if (!columnNames.includes('missingStock')) {
            console.log('Adding missingStock column...');
            await connection.query(`ALTER TABLE instruments ADD COLUMN missingStock INT NOT NULL DEFAULT 0 AFTER brokenStock`);
        } else {
            console.log('missingStock column exists.');
        }

        console.log('Schema migration completed.');

    } catch (error) {
        console.error('Error executing migration:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrateSchema();
