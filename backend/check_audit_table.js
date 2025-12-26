
const db = require('./db');

async function checkAudit() {
    console.log("=== CHECKING AUDIT LOGS TABLE ===");
    const conn = await db.getConnection();
    try {
        // 1. Check Table Structure
        const [cols] = await conn.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'audit_logs'
        `);
        console.log("Table 'audit_logs' columns:", cols);

        // 2. Try Insert Dummy Log
        const dummyId = 'TEST-' + Date.now();
        console.log("Attempting insert...");

        // Try the standard format we assume exists
        await conn.query(`
            INSERT INTO audit_logs (id, timestamp, "userId", "userName", action, "entityType", "entityId", changes, severity)
            VALUES ($1, $2, 'sys', 'System', 'TEST_LOG', 'SYSTEM', '123', 'Test Payload', 'INFO')
        `, [dummyId, Date.now()]);

        console.log("✅ Insert SUCCEEDED.");

        // Clean up
        await conn.query("DELETE FROM audit_logs WHERE id = $1", [dummyId]);


    } catch (err) {
        console.error("❌ CHECK FAILED:", err.message);
    } finally {
        conn.release();
        process.exit();
    }
}

checkAudit();
