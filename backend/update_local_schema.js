
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'steritrack',
    multipleStatements: true
};

async function updateSchema() {
    console.log("Connecting to Local DB to update schema...");
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected.");

        // Helper: Check if column exists
        async function columnExists(table, column) {
            const [rows] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                ['steritrack', table, column]
            );
            return rows.length > 0;
        }

        // 1. Transactions Table
        if (!await columnExists('transactions', 'validatedAt')) {
            console.log("Adding columns to transactions...");
            await connection.query(`ALTER TABLE transactions 
                ADD COLUMN validatedAt BIGINT AFTER validatedBy,
                ADD COLUMN validationStatus VARCHAR(20) DEFAULT 'PENDING' AFTER validatedAt,
                ADD COLUMN validationNotes TEXT AFTER validationStatus`);
        }

        // 2. Transaction Items
        if (!await columnExists('transaction_items', 'receivedCount')) {
            console.log("Adding columns to transaction_items...");
            await connection.query(`ALTER TABLE transaction_items 
                ADD COLUMN receivedCount INT DEFAULT 0 AFTER count,
                ADD COLUMN verifiedBroken INT DEFAULT 0 AFTER receivedCount,
                ADD COLUMN verifiedMissing INT DEFAULT 0 AFTER verifiedBroken,
                ADD COLUMN verificationNotes TEXT AFTER verifiedMissing`);
        }

        // 3. Transaction Set Items
        if (!await columnExists('transaction_set_items', 'receivedQuantity')) {
            console.log("Adding columns to transaction_set_items...");
            await connection.query(`ALTER TABLE transaction_set_items 
                ADD COLUMN receivedQuantity INT DEFAULT 0 AFTER quantity,
                ADD COLUMN verifiedBroken INT DEFAULT 0 AFTER receivedQuantity,
                ADD COLUMN verifiedMissing INT DEFAULT 0 AFTER verifiedBroken,
                ADD COLUMN verificationNotes TEXT AFTER verifiedMissing`);
        }

        // 4. Logs
        if (!await columnExists('logs', 'userId')) {
            console.log("Adding columns to logs...");
            await connection.query(`ALTER TABLE logs 
                ADD COLUMN userId VARCHAR(50) AFTER timestamp,
                ADD COLUMN userName VARCHAR(100) AFTER userId,
                ADD COLUMN level VARCHAR(20) DEFAULT 'INFO' AFTER userName,
                ADD COLUMN category VARCHAR(50) AFTER level,
                ADD COLUMN metadata JSON AFTER message`);
        }

        // 5. Create New Tables (IF NOT EXISTS makes this safe)
        console.log("Ensuring new tables exist...");

        await connection.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id VARCHAR(50) PRIMARY KEY,
                timestamp BIGINT NOT NULL,
                userId VARCHAR(50),
                userName VARCHAR(100),
                action VARCHAR(50) NOT NULL,
                entityType VARCHAR(50) NOT NULL,
                entityId VARCHAR(50),
                changes JSON,
                ipAddress VARCHAR(50),
                userAgent TEXT,
                severity VARCHAR(20) DEFAULT 'INFO',
                INDEX idx_timestamp (timestamp),
                INDEX idx_userId (userId),
                INDEX idx_entityType (entityType),
                INDEX idx_action (action)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(50) PRIMARY KEY,
                timestamp BIGINT NOT NULL,
                userId VARCHAR(50),
                type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                severity VARCHAR(20) DEFAULT 'INFO',
                isRead BOOLEAN DEFAULT FALSE,
                relatedEntityType VARCHAR(50),
                relatedEntityId VARCHAR(50),
                actionUrl VARCHAR(200),
                createdAt BIGINT NOT NULL,
                readAt BIGINT,
                INDEX idx_userId_isRead (userId, isRead),
                INDEX idx_timestamp (timestamp)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS transaction_approvals (
                id VARCHAR(50) PRIMARY KEY,
                transactionId VARCHAR(50) NOT NULL,
                approverRole VARCHAR(20) NOT NULL,
                approverUserId VARCHAR(50),
                approverName VARCHAR(100),
                approvalStatus VARCHAR(20) DEFAULT 'PENDING',
                approvedAt BIGINT,
                rejectedAt BIGINT,
                notes TEXT,
                createdAt BIGINT NOT NULL,
                FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
                INDEX idx_transactionId (transactionId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS instrument_history (
                id VARCHAR(50) PRIMARY KEY,
                instrumentId VARCHAR(50) NOT NULL,
                timestamp BIGINT NOT NULL,
                changedBy VARCHAR(100),
                changeType VARCHAR(20) NOT NULL,
                fieldName VARCHAR(50),
                oldValue TEXT,
                newValue TEXT,
                reason TEXT,
                INDEX idx_instrumentId (instrumentId),
                INDEX idx_timestamp (timestamp)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS discrepancy_reports (
                id VARCHAR(50) PRIMARY KEY,
                transactionId VARCHAR(50) NOT NULL,
                reportedBy VARCHAR(100) NOT NULL,
                reportedAt BIGINT NOT NULL,
                discrepancyType VARCHAR(50) NOT NULL,
                severity VARCHAR(20) DEFAULT 'MEDIUM',
                description TEXT NOT NULL,
                affectedItems JSON,
                resolution TEXT,
                resolvedBy VARCHAR(100),
                resolvedAt BIGINT,
                status VARCHAR(20) DEFAULT 'OPEN',
                FOREIGN KEY (transactionId) REFERENCES transactions(id),
                INDEX idx_transactionId (transactionId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id VARCHAR(50) PRIMARY KEY,
                userId VARCHAR(50) NOT NULL,
                userName VARCHAR(100),
                loginAt BIGINT NOT NULL,
                logoutAt BIGINT,
                ipAddress VARCHAR(50),
                userAgent TEXT,
                sessionDuration INT,
                INDEX idx_userId (userId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id VARCHAR(50) PRIMARY KEY,
                settingKey VARCHAR(100) UNIQUE NOT NULL,
                settingValue TEXT,
                dataType VARCHAR(20) DEFAULT 'STRING',
                description TEXT,
                updatedBy VARCHAR(100),
                updatedAt BIGINT,
                INDEX idx_settingKey (settingKey)
            )
        `);

        // 6. Create Views
        console.log("Updating Views...");
        await connection.query(`
            CREATE OR REPLACE VIEW v_transaction_discrepancies AS
            SELECT 
                t.id AS transactionId, t.timestamp, t.type, t.unitId, u.name AS unitName,
                t.createdBy, t.validatedBy, t.validationStatus,
                COUNT(DISTINCT ti.instrumentId) AS totalItems,
                SUM(ti.verifiedBroken) AS totalBroken,
                SUM(ti.verifiedMissing) AS totalMissing,
                CASE WHEN SUM(ti.verifiedBroken + ti.verifiedMissing) > 0 THEN 'HAS_DISCREPANCY'
                ELSE 'NO_DISCREPANCY' END AS discrepancyStatus
            FROM transactions t
            LEFT JOIN transaction_items ti ON t.id = ti.transactionId
            LEFT JOIN units u ON t.unitId = u.id
            WHERE t.status = 'COMPLETED'
            GROUP BY t.id
        `);

        await connection.query(`
            CREATE OR REPLACE VIEW v_user_activity_summary AS
            SELECT 
                userId, userName, COUNT(*) AS totalActions,
                COUNT(DISTINCT DATE(FROM_UNIXTIME(timestamp/1000))) AS activeDays,
                MIN(timestamp) AS firstActivity, MAX(timestamp) AS lastActivity
            FROM audit_logs
            GROUP BY userId, userName
        `);

        await connection.query(`
            CREATE OR REPLACE VIEW v_pending_validations AS
            SELECT 
                t.id, t.timestamp, t.type, t.unitId, u.name AS unitName,
                t.createdBy, t.qrCode,
                COUNT(DISTINCT ti.instrumentId) AS itemCount,
                COUNT(DISTINCT tsi.setId) AS setCount,
                TIMESTAMPDIFF(HOUR, FROM_UNIXTIME(t.timestamp/1000), NOW()) AS hoursWaiting
            FROM transactions t
            LEFT JOIN transaction_items ti ON t.id = ti.transactionId
            LEFT JOIN transaction_set_items tsi ON t.id = tsi.transactionId
            LEFT JOIN units u ON t.unitId = u.id
            WHERE t.status = 'PENDING'
            GROUP BY t.id
            ORDER BY t.timestamp ASC
        `);

        console.log("SCHEMA UPDATE COMPLETE. Local Data Preserved.");

    } catch (e) {
        console.error("MIGRATION ERROR:", e);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
