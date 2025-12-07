const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const backendEnv = path.join(__dirname, '.env');
const rootEnvLocal = path.join(__dirname, '../.env.local');

if (fs.existsSync(backendEnv)) {
    console.log('Loading env from:', backendEnv);
    require('dotenv').config({ path: backendEnv });
} else if (fs.existsSync(rootEnvLocal)) {
    console.log('Loading env from:', rootEnvLocal);
    require('dotenv').config({ path: rootEnvLocal });
} else {
    require('dotenv').config();
}

async function migrate() {
    let connection;
    try {
        console.log('Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
        });

        const dbName = process.env.DB_NAME || 'steritrack';
        console.log(`Ensuring database '${dbName}' exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);

        console.log('Checking users table...');
        const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'is_active'");
        if (columns.length === 0) {
            console.log('Adding is_active column...');
            await connection.query("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
            console.log('Column added.');
        } else {
            console.log('Column is_active already exists.');
        }

    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') {
            console.log('Table users missing. initializing schema...');
            const schemaPath = path.join(__dirname, 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf8');
                // Remove MySQL specific comments if they cause issues, and split
                // Simple split by ; might fail on triggers/procedures but standard schema is simple
                const statements = schema.split(';').filter(s => s.trim());
                for (let sql of statements) {
                    try {
                        await connection.query(sql);
                    } catch (err) {
                        // Ignore harmless errors like "Query was empty"
                        if (err.code !== 'ER_EMPTY_QUERY') console.error('Schema error:', err.message);
                    }
                }
                console.log('Schema initialized.');
            }
        } else {
            console.error('Migration error:', e);
        }
    } finally {

        if (connection) await connection.end();
    }
}

migrate();
