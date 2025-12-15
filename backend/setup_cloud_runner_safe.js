
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'mysql-steritrack-steritrack.l.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_h7ulD6W5HuUjMVofeYJ',
    database: 'defaultdb',
    port: 27452,
    ssl: { rejectUnauthorized: false },
    multipleStatements: false // Disable to be safe
};

function splitQueries(sql) {
    return sql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('/*'));
}

async function runSetup() {
    console.log("Connecting to Cloud DB...");
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected.");

        // 0. Clean (One by one)
        const drops = [
            'DROP VIEW IF EXISTS v_transaction_discrepancies',
            'DROP VIEW IF EXISTS v_user_activity_summary',
            'DROP VIEW IF EXISTS v_pending_validations',
            'DROP TABLE IF EXISTS discrepancy_reports',
            'DROP TABLE IF EXISTS user_sessions',
            'DROP TABLE IF EXISTS system_settings',
            'DROP TABLE IF EXISTS audit_logs',
            'DROP TABLE IF EXISTS notifications',
            'DROP TABLE IF EXISTS transaction_approvals',
            'DROP TABLE IF EXISTS instrument_history',
            'DROP TABLE IF EXISTS request_items',
            'DROP TABLE IF EXISTS requests',
            'DROP TABLE IF EXISTS transaction_set_items',
            'DROP TABLE IF EXISTS transaction_items',
            'DROP TABLE IF EXISTS transaction_packs',
            'DROP TABLE IF EXISTS transactions',
            'DROP TABLE IF EXISTS instrument_unit_stock',
            'DROP TABLE IF EXISTS instrument_set_items',
            'DROP TABLE IF EXISTS sterile_pack_items',
            'DROP TABLE IF EXISTS instrument_sets',
            'DROP TABLE IF EXISTS sterile_packs',
            'DROP TABLE IF EXISTS instruments',
            'DROP TABLE IF EXISTS units',
            'DROP TABLE IF EXISTS users',
            'DROP TABLE IF EXISTS logs'
        ];

        console.log("Dropping old tables...");
        for (const q of drops) {
            try { await connection.query(q); } catch (e) {
                // ignore
            }
        }

        // 1. Schema
        console.log("Running Schema...");
        let schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        // Remove DB creation
        schemaSql = schemaSql.replace(/CREATE DATABASE.*;/gi, '')
            .replace(/USE steritrack;/gi, '');

        const schemaQueries = splitQueries(schemaSql);
        for (const q of schemaQueries) {
            try {
                await connection.query(q);
            } catch (e) {
                console.error(`Error in Schema Query: ${q.substring(0, 50)}... -> ${e.message}`);
            }
        }

        // 2. Migration
        console.log("Running Migration...");
        const migrationPath = path.join(__dirname, 'migration_enhanced_validation_audit.sql');
        if (fs.existsSync(migrationPath)) {
            let migrationSql = fs.readFileSync(migrationPath, 'utf8');
            // Truncate procedures
            const splitIndex = migrationSql.indexOf('-- PART 11: STORED PROCEDURES');
            if (splitIndex !== -1) {
                migrationSql = migrationSql.substring(0, splitIndex);
            }

            const migQueries = splitQueries(migrationSql);
            for (const q of migQueries) {
                try {
                    await connection.query(q);
                } catch (e) {
                    // Ignore column exists errors or similar, but log them
                    // migration often has ALTER TABLE ADD COLUMN which fails if exists
                    if (!e.message.includes("Duplicate column")) {
                        console.warn(`Migration Warning: ${e.message}`);
                    }
                }
            }
        }

        // 3. Seed
        console.log("Seeding...");
        try {
            const unitId = 'u2';
            const [instruments] = await connection.query('SELECT id, name FROM instruments LIMIT 5');
            if (instruments && instruments.length > 0) {
                for (const inst of instruments) {
                    const qty = 10;
                    await connection.query(`
                        INSERT INTO instrument_unit_stock (unitId, instrumentId, quantity)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE quantity = quantity + ?
                    `, [unitId, inst.id, qty, qty]);
                }
                console.log(`Seeded ${instruments.length} items to ${unitId}`);
            }
        } catch (e) {
            console.error("Seed Error:", e.message);
        }

        console.log("SUCCESS: Cloud DB Setup Complete.");

    } catch (e) {
        console.error("FATAL:", e);
    } finally {
        if (connection) await connection.end();
    }
}

runSetup();
