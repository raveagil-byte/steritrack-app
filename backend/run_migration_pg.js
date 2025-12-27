const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Please provide a SQL file path.");
        process.exit(1);
    }

    const fullPath = path.resolve(__dirname, '..', filePath);
    console.log(`Running Migration: ${fullPath}`);

    const sql = fs.readFileSync(fullPath, 'utf8');

    const client = await db.getConnection();
    try {
        console.log("Executing SQL...");
        await client.query(sql);
        console.log("✅ Migration applied successfully!");
    } catch (err) {
        console.error("❌ Migration Failed:", err.message);
    } finally {
        client.release();
        process.exit();
    }
}

runMigration();
