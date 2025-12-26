
const db = require('./db');

async function fixCssdMaxStock() {
    console.log("=== FIXING CSSD MAX STOCK PAR LEVELS ===");
    const conn = await db.getConnection();
    try {
        // 1. Get CSSD Unit ID
        const [rows] = await conn.query("SELECT id FROM units WHERE type='CSSD'");
        const cssdUnitId = rows[0]?.id;

        if (!cssdUnitId) {
            console.error("❌ CSSD Unit not found!");
            return;
        }
        console.log("CSSD Unit ID:", cssdUnitId);

        // 2. Check if max_stock column exists in inventory_snapshots
        // We assume it does because the app works, but let's be safe.
        // Actually, if it doesn't, the next query will fail, which is caught.

        // 3. Update max_stock for CSSD
        // Logic: For CSSD, if max_stock is low (default 0 or 100 implicit), set it to Math.max(quantity * 1.5, 1000)
        // We utilize Postgres GREATEST function.
        // We only update rows that exist in snapshots (which we populated in previous step)

        // Note: 'max_stock' column name assumed based on controller query.
        // If it's NULL, COALESCE logic in controller returns empty, necessitating default in UI.
        // But here we want to WRITE to it so UI sees a real value.

        const updateQuery = `
            UPDATE inventory_snapshots 
            SET max_stock = GREATEST(quantity + 500, 1000)
            WHERE "unitId" = $1 
              AND (max_stock IS NULL OR max_stock < quantity)
        `;

        // Be careful with quoting:
        // previous fix_cssd_snapshots used: instrumentId, unitId (unquoted) 
        // Controller query used: s.unitid, s.max_stock (unquoted)
        // Schema checks: unitId, instrumentId (camelCase in CREATE TABLE?)
        // Step 504 view: unitId, instrumentId (unquoted in CREATE TABLE).
        // Postgres creates 'unitid', 'instrumentid'.
        // So we should use unquoted 'unitId' -> 'unitid'.

        const realQuery = `
            UPDATE inventory_snapshots 
            SET max_stock = GREATEST(quantity + 500, 1000)
            WHERE unitId = $1 
              AND (max_stock IS NULL OR max_stock < quantity)
        `;

        const result = await conn.query(realQuery, [cssdUnitId]);
        console.log(`✅ Updated CSSD Quotas. Rows affected: ${result[1]?.rowCount || '?'}`); // result[1] is CommandResult in pg

        // If rowCount is undefined (mysql2 style wrapper?), check result struct
        // Our db.js wrapper returns [rows, fields]. 
        // For UPDATE, pg returns result object.
        // Let's just log result to be sure.
        console.log("Result:", result);

    } catch (err) {
        console.error("❌ UPDATE FAILED:", err.message);
        if (err.message.includes('column "max_stock" does not exist')) {
            console.log("⚠️ Adding max_stock column...");
            await conn.query('ALTER TABLE inventory_snapshots ADD COLUMN max_stock INT DEFAULT 0');
            console.log("✅ Column added. Rerunning update...");
            // Recursive call or copy-paste? Let's just retry logic briefly
            const realQuery = `
                UPDATE inventory_snapshots 
                SET max_stock = GREATEST(quantity + 500, 1000)
                WHERE unitId = $1 
            `;
            await conn.query(realQuery, [cssdUnitId]);
            console.log("✅ Updated CSSD Quotas after schema fix.");
        }
    } finally {
        conn.release();
        process.exit();
    }
}

fixCssdMaxStock();
