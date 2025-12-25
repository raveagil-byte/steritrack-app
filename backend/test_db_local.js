const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('Testing connection with config:');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('SUCCESS: Connected to database!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Could not connect:', err.message);
        process.exit(1);
    }
}

testConnection();
