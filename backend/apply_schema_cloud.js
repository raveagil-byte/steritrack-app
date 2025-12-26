const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load Cloud Config specifically
const prodEnv = path.resolve(__dirname, '../.env.production');
if (fs.existsSync(prodEnv)) {
    dotenv.config({ path: prodEnv });
}

async function applyCloudSchema() {
    console.log(`☁️ Applying Schema to CLOUD: ${process.env.DB_HOST}`);

    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Cloud DB.");

        // Read schema file
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema_pg.sql'), 'utf8');

        // Execute
        console.log("🚀 Executing Schema SQL...");
        await client.query(schemaSql);
        console.log("✅ Cloud Schema Applied Successfully!");

    } catch (err) {
        console.error("❌ Cloud Schema Error:", err.message);
    } finally {
        await client.end();
    }
}

applyCloudSchema();
