
const db = require('./db');

async function fixAudit() {
    console.log("=== FIXING AUDIT LOGS TABLE ===");
    const conn = await db.getConnection();
    try {
        console.log("[1] Creating 'audit_logs' table (compatible schema)...");

        // Ensure audit_logs exists with columns that match Code usage
        // Code expects: id, timestamp, userId, userName, action, entityType, entityId, changes, severity

        await conn.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id VARCHAR(50) PRIMARY KEY,
                timestamp BIGINT NOT NULL,
                "userId" VARCHAR(50), 
                "userName" VARCHAR(100),
                action VARCHAR(100),
                "entityType" VARCHAR(50),
                "entityId" VARCHAR(50),
                changes TEXT,
                severity VARCHAR(20) DEFAULT 'INFO'
            )
        `);
        console.log("✅ Table 'audit_logs' created/verified.");

        // Migration: If audit_logs_new exists, maybe copy data?
        // For now, just ensuring the table exists is enough to stop the crash.

    } catch (err) {
        console.error("❌ FIX FAILED:", err.message);
    } finally {
        conn.release();
        process.exit();
    }
}

fixAudit();
