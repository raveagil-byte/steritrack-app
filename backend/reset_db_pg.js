const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function resetAndSetup() {
    try {
        console.log('🗑️  Dropping all existing tables in public schema...');

        // Output Drop Schema
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;');

        console.log('✅ Schema reset complete.');
        console.log('🐘 Initializing New PostgreSQL Schema...');

        const schemaPath = path.join(__dirname, 'schema_pg.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schema);

        console.log('✅ PostgreSQL Schema applied successfully.');
        console.log('🚀 Database is fresh and ready!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error applying schema:', err);
        process.exit(1);
    }
}

resetAndSetup();
