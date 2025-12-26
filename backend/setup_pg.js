const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function setup() {
    try {
        console.log('🐘 Initializing PostgreSQL Database...');

        const schemaPath = path.join(__dirname, 'schema_pg.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at ${schemaPath}`);
        }

        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute the entire schema script
        // Note: pg module supports multiple statements in a single query by default
        await pool.query(schema);

        console.log('✅ PostgreSQL Schema applied successfully.');
        console.log('🚀 You are ready to run the server!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error applying schema:', err);
        process.exit(1);
    }
}

setup();
