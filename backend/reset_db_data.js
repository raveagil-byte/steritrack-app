const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load Config
const prodEnv = path.resolve(__dirname, '../.env.production');
const localEnv = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(prodEnv)) {
    dotenv.config({ path: prodEnv });
} else if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
}

console.log(`⚠️  DANGER: RESETTING DATABASE ON HOST: ${process.env.DB_HOST} ⚠️`);

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

async function resetDatabase() {
    try {
        await client.connect();

        console.log("🔥 Formatting Database (Deleting Data)...");

        // 1. Delete Transaction & Activity Data
        await client.query('TRUNCATE transaction_items, transaction_set_items, transaction_packs, transactions CASCADE');
        await client.query('TRUNCATE request_items, requests CASCADE');
        await client.query('TRUNCATE sterilization_batch_items, sterilization_batches CASCADE');
        await client.query('TRUNCATE sterile_pack_items, sterile_packs CASCADE');
        await client.query('TRUNCATE inventory_snapshots CASCADE');
        await client.query('TRUNCATE instrument_assets CASCADE');
        await client.query('TRUNCATE instrument_unit_stock CASCADE');
        await client.query('TRUNCATE audit_logs, logs CASCADE');

        // 2. Delete Instrument Master Data
        console.log("🗑️  Deleting Master Instruments...");
        await client.query('TRUNCATE instrument_set_items, instrument_set_versions, instrument_sets CASCADE');
        await client.query('DELETE FROM instruments'); // Delete rows, keep table

        // 3. Reset Users (Keep Admin, Delete others if needed, for now we KEEP Users & Units to avoid lockout)
        // console.log("Cleaning Users (Keeping Admin)...");
        // await client.query("DELETE FROM users WHERE username != 'admin'");

        console.log("✅ Database Cleaned! (Users & Units Preserved for Login)");

        // 4. Re-Seed Minimal Data if Instruments table is empty?
        // Let's NOT re-seed instruments so user starts FRESH.

    } catch (err) {
        console.error("❌ Error resetting DB:", err.message);
    } finally {
        await client.end();
    }
}

resetDatabase();
