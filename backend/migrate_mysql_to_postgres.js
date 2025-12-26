
const mysql = require('mysql2/promise');
const db = require('./db'); // Postgres pool

async function migrate() {
    console.log("🚀 STARTING MIGRATION: MySQL -> PostgreSQL");

    // 1. Config MySQL
    const mysqlConfig = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'steritrack',
        port: 3306
    };

    let mysqlConn;
    let pgConn;

    try {
        mysqlConn = await mysql.createConnection(mysqlConfig);
        pgConn = await db.getConnection();
        console.log("✅ Both databases connected.");

        await pgConn.query('BEGIN'); // Start Transaction

        // --- A. MIGRATE UNITS ---
        console.log("\n[1] Migrating UNITS...");
        const [mysqlUnits] = await mysqlConn.query("SELECT * FROM units");
        for (const u of mysqlUnits) {
            // Try unquoted to let Postgres fold to lowercase
            await pgConn.query(`
                INSERT INTO units (id, name, qrCode, type) 
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO NOTHING
            `, [u.id, u.name, u.qrCode || u.qrcode || u.id, u.type || 'General']);
        }
        console.log(`   Processed ${mysqlUnits.length} units.`);

        // --- B. MIGRATE USERS ---
        console.log("\n[2] Migrating USERS...");
        const [mysqlUsers] = await mysqlConn.query("SELECT * FROM users");
        for (const u of mysqlUsers) {
            await pgConn.query(`
                INSERT INTO users (id, username, password, name, role, unitId, is_active) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO NOTHING
            `, [u.id, u.username, u.password, u.name, u.role, u.unitId || null, u.is_active || true]);
        }
        console.log(`   Processed ${mysqlUsers.length} users.`);

        // --- C. MIGRATE INSTRUMENTS ---
        console.log("\n[3] Migrating INSTRUMENTS...");
        const [mysqlInst] = await mysqlConn.query("SELECT * FROM instruments");
        for (const i of mysqlInst) {
            await pgConn.query(`
                INSERT INTO instruments (id, name, category, totalStock, cssdStock, dirtyStock, packingStock, is_active, is_serialized, measure_unit_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'mu1')
                ON CONFLICT (id) DO UPDATE SET 
                    totalStock = EXCLUDED.totalStock,
                    cssdStock = EXCLUDED.cssdStock,
                    dirtyStock = EXCLUDED.dirtyStock
            `, [
                i.id,
                i.name,
                i.category,
                i.totalStock || 0,
                i.cssdStock || 0,
                i.dirtyStock || 0,
                i.packingStock || 0,
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
                await pgConn.query(`
                    INSERT INTO instrument_sets(id, name, description) 
                    VALUES($1, $2, $3)
                    ON CONFLICT(id) DO NOTHING
                    `, [s.id, s.name, s.description]);
            }

            const [mysqlSetItems] = await mysqlConn.query("SELECT * FROM instrument_set_items");
            for (const item of mysqlSetItems) {
                // Ensure IDs match legacy snake_case or camelCase from MySQL
                const sId = item.setId || item.set_id;
                const iId = item.instrumentId || item.instrument_id;

                if (sId && iId) {
                    await pgConn.query(`
                        INSERT INTO instrument_set_items(setId, instrumentId, quantity) 
                        VALUES($1, $2, $3)
                        ON CONFLICT(setId, instrumentId) DO NOTHING
                    `, [sId, iId, item.quantity]);
                }
            }
            console.log(`   Processed ${mysqlSets.length} sets and ${mysqlSetItems.length} items.`);
        } catch (e) {
            console.log("   Skipping Sets (Table not found in MySQL or error):", e.message);
        }

        await pgConn.query('COMMIT');
        console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!");

    } catch (err) {
        if (pgConn) await pgConn.query('ROLLBACK');
        console.error("❌ MIGRATION FAILED:", err);
        // Clean exit
    } finally {
        if (mysqlConn) await mysqlConn.end();
        if (pgConn) pgConn.release();
        process.exit();
    }
}

migrate();
