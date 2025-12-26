const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load envs
const envPath = path.resolve(__dirname, '../.env.local');
const rootEnv = path.resolve(__dirname, '../.env');
const localEnv = path.resolve(__dirname, '.env');

if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
} else {
    dotenv.config();
}

async function createDatabase() {
    console.log('🐘 Connecting to system database to create "steritrack"...');

    // Connect to default 'postgres' database
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: 'postgres', // Connect to default DB first
        ssl: (process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : undefined
    });

    try {
        await client.connect();

        // Check if database exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'steritrack'");
        if (res.rows.length === 0) {
            console.log('✨ Database "steritrack" not found. Creating it...');
            await client.query('CREATE DATABASE "steritrack"');
            console.log('✅ Database "steritrack" created successfully!');
        } else {
            console.log('ℹ️ Database "steritrack" already exists.');
        }
    } catch (err) {
        console.error('❌ Error creating database:', err.message);
        if (err.code === '28P01') {
            console.error('🔑 Authentication failed. Please check your DB_PASSWORD in .env file.');
        }
    } finally {
        await client.end();
    }
}

createDatabase();
