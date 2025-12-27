const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load Cloud Config
const prodEnv = path.resolve(__dirname, '../.env.production');
if (fs.existsSync(prodEnv)) {
    dotenv.config({ path: prodEnv });
}

async function createAssetsTable() {
    console.log(`☁️ Creating 'instrument_assets' on CLOUD: ${process.env.DB_HOST}`);

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

        const query = `
            CREATE TABLE IF NOT EXISTS instrument_assets (
                id VARCHAR(50) PRIMARY KEY,
                instrumentid VARCHAR(50) NOT NULL,
                serialnumber VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'READY', 
                location VARCHAR(50) DEFAULT 'CSSD',
                notes TEXT,
                usagecount INTEGER DEFAULT 0,
                createdat BIGINT,
                updatedat BIGINT,
                FOREIGN KEY (instrumentid) REFERENCES instruments(id) ON DELETE CASCADE,
                UNIQUE(instrumentid, serialnumber)
            );
        `;

        await client.query(query);
        console.log("✅ Cloud: Table 'instrument_assets' created/verified.");

        // Also fix LOCAL database
        console.log("🔄 ALSO UPDATING LOCAL DATABASE...");
        const localClient = new Client({
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: '',
            database: 'steritrack'
        });

        try {
            await localClient.connect();
            await localClient.query(query);
            console.log("✅ Local: Table 'instrument_assets' created/verified.");
            await localClient.end();
        } catch (e) {
            console.log("⚠️ Failed to update local DB:", e.message);
        }

    } catch (err) {
        console.error("❌ Error creating table:", err.message);
    } finally {
        await client.end();
    }
}

createAssetsTable();
