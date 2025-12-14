const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
    try {
        console.log('Starting migration for Hybrid Tracking...');

        const sqlPath = path.join(__dirname, 'migration_add_hybrid_tracking.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon, but be careful (simple split might break if semicolon in text, but since we wrote the SQL cleanly it's fine for now or use multipleStatements)
        // Since db.js has multipleStatements: true, we can run it directly.

        await db.query(sql);

        console.log('Migration executed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
