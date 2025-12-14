const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: '127.0.0.1', // Use strict IPv4
    user: 'root',
    password: '',
    database: 'steritrack',
    multipleStatements: true
};

async function runMigration() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('1. Applying Schema Migration...');
        try {
            const sqlPath = path.join(__dirname, 'migration_add_hybrid_tracking.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await connection.query(sql);
            console.log('   Schema migration applied.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('   Schema column already exists, skipping ADD COLUMN.');
                // We still need to ensure the other tables exist (instrument_assets).
                // The migration file has multiple statements. If the first fails, the rest might not run in standard MySQL unless handled.
                // db.js has multipleStatements: true.
                // If one fails, the whole query might stop?
                // Let's manually ensure instrument_assets exists.
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS instrument_assets (
                        id VARCHAR(50) PRIMARY KEY,
                        instrumentId VARCHAR(50) NOT NULL,
                        serialNumber VARCHAR(100) NOT NULL,
                        purchaseDate DATE,
                        warrantyExpiry DATE,
                        usageCount INT DEFAULT 0,
                        maxUsageLimit INT,
                        status VARCHAR(20) DEFAULT 'READY',
                        notes TEXT,
                        location VARCHAR(50),
                        createdAt BIGINT,
                        updatedAt BIGINT,
                        FOREIGN KEY (instrumentId) REFERENCES instruments(id) ON DELETE CASCADE,
                        UNIQUE KEY unique_serial (instrumentId, serialNumber),
                        INDEX idx_status (status),
                        INDEX idx_serial (serialNumber)
                    );
                 `);
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS transaction_asset_details (
                        id VARCHAR(50) PRIMARY KEY,
                        transactionId VARCHAR(50) NOT NULL,
                        instrumentId VARCHAR(50) NOT NULL,
                        assetId VARCHAR(50) NOT NULL,
                        FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
                        FOREIGN KEY (instrumentId) REFERENCES instruments(id),
                        FOREIGN KEY (assetId) REFERENCES instrument_assets(id),
                        UNIQUE KEY unique_tx_asset (transactionId, assetId)
                    );
                 `);
                console.log('   Ensured tables exist manually.');
            } else {
                console.warn('   Schema migration warning:', e.message);
            }
        }

        console.log('2. Enabling Serialization for ALL Instruments...');
        await connection.query("UPDATE instruments SET is_serialized = TRUE");
        console.log('   All instruments set to is_serialized = TRUE.');

        console.log('3. Generating Assets for existing stock...');
        const [instruments] = await connection.query("SELECT * FROM instruments");

        for (const inst of instruments) {
            console.log(`   Processing ${inst.name} (${inst.id})...`);

            let serialCounter = 1;
            const assetsToInsert = [];

            // 3.1. Create assets for CSSD Stock (assumed status 'READY')
            // Using a limit to avoid infinite loops if data is corrupted, but totalStock should be reasonable.
            const cssdCount = inst.cssdStock || 0;
            for (let i = 0; i < cssdCount; i++) {
                const sn = `SN-${inst.id}-${String(serialCounter).padStart(4, '0')}`;
                // id, instrumentId, serialNumber, status, location, createdAt
                assetsToInsert.push([
                    `AST-${inst.id}-${serialCounter}`, // UUID-like
                    inst.id,
                    sn,
                    'READY',
                    'CSSD'
                ]);
                serialCounter++;
            }

            // 3.2. Create assets for Unit Stock (assumed status 'distributed' -> 'READY' at UNIT?)
            // Actually, if it's at a unit, it might be in use or ready. Let's assume 'READY' but location = UnitID.
            const [unitStocks] = await connection.query("SELECT * FROM instrument_unit_stock WHERE instrumentId = ?", [inst.id]);
            for (const stock of unitStocks) {
                for (let i = 0; i < stock.quantity; i++) {
                    const sn = `SN-${inst.id}-${String(serialCounter).padStart(4, '0')}`;
                    assetsToInsert.push([
                        `AST-${inst.id}-${serialCounter}`,
                        inst.id,
                        sn,
                        'READY', // Or 'IN_UNIT'
                        stock.unitId
                    ]);
                    serialCounter++;
                }
            }

            // Batch insert
            if (assetsToInsert.length > 0) {
                const placeholders = assetsToInsert.map(() => '(?, ?, ?, ?, ?)').join(', ');
                const flatValues = assetsToInsert.flat();
                const insertQuery = `
                    INSERT IGNORE INTO instrument_assets 
                    (id, instrumentId, serialNumber, status, location) 
                    VALUES ${placeholders}
                `;
                await connection.query(insertQuery, flatValues);
                console.log(`     -> Generated ${assetsToInsert.length} assets.`);
            } else {
                console.log(`     -> No stock found.`);
            }
        }

        console.log('Migration & Data Conversion Complete!');

    } catch (error) {
        console.error('Migration Failed:', error);
    } finally {
        await connection.end();
    }
}

runMigration();
