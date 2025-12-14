const db = require('./db');

async function createTables() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS sterile_packs (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                type VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL,
                targetUnitId VARCHAR(50),
                createdAt BIGINT NOT NULL,
                packedBy VARCHAR(100),
                expiresAt BIGINT,
                qrCode VARCHAR(100)
            )
        `);
        console.log('Created sterile_packs table');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS sterile_pack_items (
                packId VARCHAR(50),
                instrumentId VARCHAR(50),
                itemType VARCHAR(20) DEFAULT 'SINGLE',
                quantity INT NOT NULL DEFAULT 1,
                FOREIGN KEY (packId) REFERENCES sterile_packs(id) ON DELETE CASCADE
            )
        `);
        console.log('Created sterile_pack_items table');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS transaction_packs (
                transactionId VARCHAR(50),
                packId VARCHAR(50),
                PRIMARY KEY (transactionId, packId),
                FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
                FOREIGN KEY (packId) REFERENCES sterile_packs(id) ON DELETE CASCADE
            )
        `);
        console.log('Created transaction_packs table');

        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('Error creating tables:', err);
        process.exit(1);
    }
}

createTables();
