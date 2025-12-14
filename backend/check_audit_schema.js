const db = require('./db');

async function checkAuditSchema() {
    try {
        console.log("Checking audit_logs table...");
        const [rows] = await db.query("SHOW TABLES LIKE 'audit_logs'");

        if (rows.length === 0) {
            console.log("Table audit_logs MISSING!");

            console.log("Creating table...");
            await db.query(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id VARCHAR(50) PRIMARY KEY,
                    timestamp BIGINT NOT NULL,
                    userId VARCHAR(50),
                    userName VARCHAR(100),
                    action VARCHAR(50) NOT NULL,
                    entityType VARCHAR(50) NOT NULL,
                    entityId VARCHAR(50),
                    changes TEXT,
                    ipAddress VARCHAR(50),
                    userAgent VARCHAR(255),
                    severity VARCHAR(20) DEFAULT 'INFO'
                )
            `);
            console.log("Table created successfully.");
        } else {
            console.log("Table audit_logs EXISTS.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkAuditSchema();
