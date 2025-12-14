const db = require('./db');

async function addTargetUnitColumn() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database...');

        // Add targetUnitId column to sterile_packs
        try {
            await connection.query(`ALTER TABLE sterile_packs ADD COLUMN targetUnitId VARCHAR(50) AFTER status`);
            console.log('Added targetUnitId column to sterile_packs table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('targetUnitId column already exists');
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

addTargetUnitColumn();
