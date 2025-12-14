const db = require('./db');

async function updateSchema() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database...');

        // Add packingStock column if it doesn't exist
        try {
            await connection.query(`ALTER TABLE instruments ADD COLUMN packingStock INT NOT NULL DEFAULT 0 AFTER dirtyStock`);
            console.log('Added packingStock column to instruments table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('packingStock column already exists');
            } else {
                throw err;
            }
        }

        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
