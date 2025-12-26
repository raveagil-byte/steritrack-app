const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load Cloud Config
const prodEnv = path.resolve(__dirname, '../.env.production');
if (fs.existsSync(prodEnv)) {
    dotenv.config({ path: prodEnv });
}

async function addMissingUserColumns() {
    console.log(`☁️ Checking 'users' columns on CLOUD: ${process.env.DB_HOST}`);

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

        // Check if phone exists
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='phone'");
        if (res.rows.length === 0) {
            console.log("⚠️ Column 'phone' missing. Adding it...");
            await client.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20)");
        } else {
            console.log("✅ Column 'phone' exists.");
        }

        // Check photo_url
        const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='photo_url'");
        if (res2.rows.length === 0) {
            console.log("⚠️ Column 'photo_url' missing. Adding it...");
            await client.query("ALTER TABLE users ADD COLUMN photo_url TEXT");
        } else {
            console.log("✅ Column 'photo_url' exists.");
        }

        // Also fix LOCAL database just in case
        console.log("🔄 ALSO UPDATING LOCAL DATABASE...");
        const localClient = new Client({
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: '', // Adjust if needed
            database: 'steritrack'
        });

        try {
            await localClient.connect();
            // Check if phone exists locally
            const lRes = await localClient.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='phone'");
            if (lRes.rows.length === 0) {
                await localClient.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20)");
                console.log("✅ Local: Added 'phone'");
            }
            const lRes2 = await localClient.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='photo_url'");
            if (lRes2.rows.length === 0) {
                await localClient.query("ALTER TABLE users ADD COLUMN photo_url TEXT");
                console.log("✅ Local: Added 'photo_url'");
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

addMissingUserColumns();
