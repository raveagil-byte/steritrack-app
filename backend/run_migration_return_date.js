const db = require('./db');

async function runMigration() {
    try {
        console.log('Running migration: add_expected_return_date...');
        await db.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expectedreturndate BIGINT');
        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }
    process.exit();
}

runMigration();
