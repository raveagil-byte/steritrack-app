const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (prefer cloud env in .env.production)
const prodEnv = path.resolve(__dirname, '../.env.production');
if (fs.existsSync(prodEnv)) {
    dotenv.config({ path: prodEnv });
} else {
    dotenv.config();
}

console.log("🚀 STARTING MIGRATION: Local MySQL -> Cloud PostgreSQL");
console.log(`Cloud Destination: ${process.env.DB_HOST} (SSL: ${process.env.DB_SSL})`);

async function migrate() {
    // 1. Config MySQL (Local Source)
    // NOTE: This assumes your local MySQL is still running on port 3306
    // If you stopped it or uninstalled it, this script will fail.
    const mysqlConfig = {
        host: 'localhost',
        user: 'root',
        password: '', // Replace if you have a local root password
        database: 'steritrack',
        port: 3306
    };

    // 2. Config Postgres (Cloud Destination)
    const pgPool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'defaultdb',
        ssl: { rejectUnauthorized: false }
    });

    let mysqlConn;
    let pgClient;

    try {
        mysqlConn = await mysql.createConnection(mysqlConfig);
        console.log("✅ Connected to Local MySQL");

        pgClient = await pgPool.connect();
        console.log("✅ Connected to Cloud PostgreSQL");

        await pgClient.query('BEGIN');

        // --- A. MIGRATE UNITS ---
        console.log("\n[1] Migrating UNITS...");
        const [mysqlUnits] = await mysqlConn.query("SELECT * FROM units");
        for (const u of mysqlUnits) {
            await pgClient.query(`
                INSERT INTO units (id, name, qrcode, type, is_active) 
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    qrcode = EXCLUDED.qrcode
            `, [u.id, u.name, u.qrCode || u.qrcode, u.type, u.is_active || true]);
        }
        console.log(`   Processed ${mysqlUnits.length} units.`);

        // --- B. MIGRATE USERS ---
        console.log("\n[2] Migrating USERS...");
        const [mysqlUsers] = await mysqlConn.query("SELECT * FROM users");
        for (const u of mysqlUsers) {
            await pgClient.query(`
                INSERT INTO users (id, username, password, name, role, unitid, is_active) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO NOTHING
            `, [u.id, u.username, u.password, u.name, u.role, u.unitId || u.unitid, u.is_active || true]);
        }
        console.log(`   Processed ${mysqlUsers.length} users.`);

        // --- C. MIGRATE INSTRUMENTS ---
        console.log("\n[3] Migrating INSTRUMENTS...");
        const [mysqlInst] = await mysqlConn.query("SELECT * FROM instruments");
        for (const i of mysqlInst) {
            // Postgres schema assumes 'cssdstock' etc are columns (lowercase)
            await pgClient.query(`
                INSERT INTO instruments (id, name, category, totalstock, cssdstock, dirtystock, packingstock, is_active, is_serialized, measure_unit_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'mu1')
                ON CONFLICT (id) DO UPDATE SET 
                    totalstock = EXCLUDED.totalstock,
                    cssdstock = EXCLUDED.cssdstock,
                    dirtystock = EXCLUDED.dirtystock,
                    packingstock = EXCLUDED.packingstock
            `, [
                i.id,
                i.name,
                i.category,
                i.totalStock || i.totalstock || 0,
                i.cssdStock || i.cssdstock || 0,
                i.dirtyStock || i.dirtystock || 0,
                i.packingStock || i.packingstock || 0,
                i.is_active || true,
                i.is_serialized || false
            ]);
        }
        console.log(`   Processed ${mysqlInst.length} instruments.`);

        // --- D. MIGRATE SETS ---
        console.log("\n[4] Migrating SETS...");
        try {
            const [mysqlSets] = await mysqlConn.query("SELECT * FROM instrument_sets");
            for (const s of mysqlSets) {
                await pgClient.query(`
                    INSERT INTO instrument_sets(id, name, description, is_active) 
                    VALUES($1, $2, $3, $4)
                    ON CONFLICT(id) DO NOTHING
                `, [s.id, s.name, s.description, s.is_active || true]);
            }

            const [mysqlSetItems] = await mysqlConn.query("SELECT * FROM instrument_set_items");
            for (const item of mysqlSetItems) {
                const sId = item.setId || item.set_id;
                const iId = item.instrumentId || item.instrument_id;
                if (sId && iId) {
                    await pgClient.query(`
                        INSERT INTO instrument_set_items(setid, instrumentid, quantity) 
                        VALUES($1, $2, $3)
                        ON CONFLICT(setid, instrumentid) DO NOTHING
                    `, [sId, iId, item.quantity]);
                }
            }
            console.log(`   Processed ${mysqlSets.length} sets and ${mysqlSetItems.length} items.`);
        } catch (e) {
            console.warn("   ⚠️ Warning migrating sets:", e.message);
        }

        await pgClient.query('COMMIT');
        console.log("\n🎉 DATA MIGRATION COMPLETED SUCCESSFULLY!");

    } catch (err) {
        if (pgClient) await pgClient.query('ROLLBACK');
        console.error("❌ MIGRATION FAILED:", err.message);
    } finally {
        if (mysqlConn) await mysqlConn.end();
        if (pgClient) pgClient.release();
        // Important: Close pool to exit script
        await pgPool.end();
    }
}

migrate();
