const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Client } = require('pg');

async function testConnection() {
    console.log('Testing PostgreSQL connection with config:');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME);
    console.log('Port:', process.env.DB_PORT || 5432);

    const client = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    try {
        await client.connect();
        console.log('SUCCESS: Connected to PostgreSQL database!');

        const res = await client.query('SELECT NOW() as now');
        console.log('Database Time:', res.rows[0].now);

        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Could not connect:', err.message);
        process.exit(1);
    }
}

testConnection();
