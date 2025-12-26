const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load Cloud Config
const prodEnv = path.resolve(__dirname, '../.env.production');
if (fs.existsSync(prodEnv)) {
    dotenv.config({ path: prodEnv });
}

async function addMaxStockColumn() {
    console.log(`☁️ Checking 'inventory_snapshots' columns on CLOUD: ${process.env.DB_HOST}`);

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

        // Check if max_stock exists
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='inventory_snapshots' AND column_name='max_stock'");
        if (res.rows.length === 0) {
            console.log("⚠️ Column 'max_stock' missing in Cloud. Adding it...");
            await client.query("ALTER TABLE inventory_snapshots ADD COLUMN max_stock INTEGER DEFAULT 0");
            console.log("✅ Cloud: Added 'max_stock'");
        } else {
            console.log("✅ Column 'max_stock' already exists in Cloud.");
        }

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
            const lRes = await localClient.query("SELECT column_name FROM information_schema.columns WHERE table_name='inventory_snapshots' AND column_name='max_stock'");
            if (lRes.rows.length === 0) {
                await localClient.query("ALTER TABLE inventory_snapshots ADD COLUMN max_stock INTEGER DEFAULT 0");
                console.log("✅ Local: Added 'max_stock'");
            } else {
                console.log("✅ Local: 'max_stock' already exists.");
            }
            await localClient.end();
        } catch (e) {
            console.log("⚠️ Failed to update local DB (might be down or diff password):", e.message);
        }

    } catch (err) {
        console.error("❌ Error updating columns:", err.message);
    } finally {
        await client.end();
    }
}

addMaxStockColumn();
