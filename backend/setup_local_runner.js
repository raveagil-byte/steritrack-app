
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Config for Localhost
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    // database: 'steritrack', // We will select this after creating it
    multipleStatements: true
};

async function runSetup() {
    console.log("Connecting to Local DB...");
    let connection;
    try {
        // Connect without selecting a database first
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected.");

        // Create Database if not exists
        await connection.query("CREATE DATABASE IF NOT EXISTS steritrack");
        await connection.query("USE steritrack");
        console.log("Database 'steritrack' selected.");

        // 0. Clean Slate (Drop Tables)
        console.log("Cleaning old tables...");
        const tables = [
            'discrepancy_reports', 'user_sessions', 'system_settings', 'audit_logs', 'notifications', 'transaction_approvals', 'instrument_history',
            'request_items', 'requests',
            'transaction_set_items', 'transaction_items', 'transaction_packs', 'transactions',
            'instrument_unit_stock', 'instrument_set_items', 'sterile_pack_items',
            'instrument_sets', 'sterile_packs',
            'instruments', 'units', 'users', 'logs'
        ];

        // Disable FK checks to allow dropping easily
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");

        for (const t of tables) {
            try {
                await connection.query(`DROP VIEW IF EXISTS v_transaction_discrepancies`);
                await connection.query(`DROP VIEW IF EXISTS v_user_activity_summary`);
                await connection.query(`DROP VIEW IF EXISTS v_pending_validations`);
                await connection.query(`DROP TABLE IF EXISTS ${t}`);
            } catch (err) {
                console.warn(`Warning dropping ${t}: ${err.message}`);
            }
        }
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");
        console.log("Tables Dropped.");

        // 1. Run Schema
        console.log("Reading schema.sql...");
        let schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        // Remove CREATE DATABASE lines if present, as we already selected it
        schemaSql = schemaSql.replace(/CREATE DATABASE.*;/gi, '')
            .replace(/USE steritrack;/gi, '');

        console.log("Executing Schema...");
        await connection.query(schemaSql);
        console.log("Schema Executed.");

        // 2. Run Migration
        const migrationPath = path.join(__dirname, 'migration_enhanced_validation_audit.sql');
        if (fs.existsSync(migrationPath)) {
            console.log("Executing Migration...");
            let migrationSql = fs.readFileSync(migrationPath, 'utf8');
            await connection.query(migrationSql);
            console.log("Migration Executed.");
        }

        // 3. Seed Inventory (Manual Logic)
        console.log("Seeding Inventory Data...");
        const unitId = 'u2';
        // Check if we have instruments
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

        console.log("ALL DONE SUCCESSFULLY. Local DB is Ready.");

    } catch (e) {
        console.error("FATAL ERROR:", e);
    } finally {
        if (connection) await connection.end();
    }
}

runSetup();
