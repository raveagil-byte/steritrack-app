
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Config
const dbConfig = {
    host: 'mysql-steritrack-steritrack.l.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_h7ulD6W5HuUjMVofeYJ',
    database: 'defaultdb',
    port: 27452,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
};

async function runSetup() {
    console.log("Connecting to Cloud DB...");
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected.");

        // 0. Clean Slate (Drop Tables)
        console.log("Cleaning old tables...");
        const tables = [
            'discrepancy_reports', 'user_sessions', 'system_settings', 'audit_logs', 'notifications', 'transaction_approvals', 'instrument_history', // New tables from migration
            'request_items', 'requests',
            'transaction_set_items', 'transaction_items', 'transaction_packs', 'transactions',
            'instrument_unit_stock', 'instrument_set_items', 'sterile_pack_items',
            'instrument_sets', 'sterile_packs',
            'instruments', 'units', 'users', 'logs'
        ];

        for (const t of tables) {
            try {
                // Also drop views/procedures first if they exist
                await connection.query(`DROP VIEW IF EXISTS v_transaction_discrepancies`);
                await connection.query(`DROP VIEW IF EXISTS v_user_activity_summary`);
                await connection.query(`DROP VIEW IF EXISTS v_pending_validations`);
                // Drop table
                await connection.query(`DROP TABLE IF EXISTS ${t}`);
            } catch (err) {
                console.warn(`Warning dropping ${t}: ${err.message}`);
            }
        }
        console.log("Tables Dropped.");

        // 1. Run Schema
        console.log("Reading schema.sql...");
        let schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        schemaSql = schemaSql.replace(/CREATE DATABASE.*;/gi, '')
            .replace(/USE steritrack;/gi, '');

        console.log("Executing Schema...");
        await connection.query(schemaSql);
        console.log("Schema Executed.");

        // 2. Run Migration (Data Structures only, No Triggers/Procedures)
        const migrationPath = path.join(__dirname, 'migration_enhanced_validation_audit.sql');
        if (fs.existsSync(migrationPath)) {
            console.log("Executing Migration (Table Structure)...");
            let migrationSql = fs.readFileSync(migrationPath, 'utf8');

            // Stop before Stored Procedures to avoid restricted commands
            const splitIndex = migrationSql.indexOf('-- PART 11: STORED PROCEDURES');
            if (splitIndex !== -1) {
                console.log("Skipping Stored Procedures & Triggers to ensure Cloud compatibility.");
                migrationSql = migrationSql.substring(0, splitIndex);
            }

            await connection.query(migrationSql);
            console.log("Migration Executed.");
        }

        // 3. Seed Inventory (Manual Logic)
        console.log("Seeding Inventory Data...");
        const unitId = 'u2';
        const [instruments] = await connection.query('SELECT id, name FROM instruments LIMIT 5');

        if (instruments.length > 0) {
            for (const inst of instruments) {
                const qty = 10;
                await connection.query(`
                    INSERT INTO instrument_unit_stock (unitId, instrumentId, quantity)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE quantity = quantity + ?
                `, [unitId, inst.id, qty, qty]);
                console.log(`Added ${qty} ${inst.name} to ${unitId}`);
            }
        }

        console.log("ALL DONE SUCCESSFULLY. DB is Ready.");

    } catch (e) {
        console.error("FATAL ERROR:", e);
    } finally {
        if (connection) await connection.end();
    }
}

runSetup();
