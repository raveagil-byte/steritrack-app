const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const backendEnv = path.join(__dirname, '.env');
const rootEnvLocal = path.join(__dirname, '../.env.local');

if (fs.existsSync(backendEnv)) {
    require('dotenv').config({ path: backendEnv });
} else if (fs.existsSync(rootEnvLocal)) {
    require('dotenv').config({ path: rootEnvLocal });
} else {
    require('dotenv').config();
}

async function migrateColumns() {
    let connection;
    try {
        console.log('Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
        });

        const dbName = process.env.DB_NAME || 'steritrack';
        await connection.query(`USE \`${dbName}\``);

        const tables = ['units', 'instruments', 'instrument_sets'];

        for (const table of tables) {
            console.log(`Checking ${table}...`);
            const [columns] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE 'is_active'`);
            if (columns.length === 0) {
                console.log(`Adding is_active column to ${table}...`);
                await connection.query(`ALTER TABLE ${table} ADD COLUMN is_active BOOLEAN DEFAULT TRUE`);
                console.log('Column added.');
            } else {
                console.log(`Column is_active already exists in ${table}.`);
            }
        }

    } catch (e) {
        console.error('Migration error:', e);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

migrateColumns();
