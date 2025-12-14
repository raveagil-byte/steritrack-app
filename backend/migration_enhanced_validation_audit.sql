-- =====================================================
-- MIGRATION: Enhanced Transaction Validation & Audit Log
-- Purpose: Implement physical verification and comprehensive audit trail
-- Priority: CRITICAL (Priority 1)
-- Date: 2024-12-10
-- =====================================================

-- =====================================================
-- PART 1: ENHANCED TRANSACTION VALIDATION
-- =====================================================

-- Add validation tracking columns to transactions table
ALTER TABLE transactions 
ADD COLUMN validatedAt BIGINT AFTER validatedBy,
ADD COLUMN validationStatus VARCHAR(20) DEFAULT 'PENDING' AFTER validatedAt,
ADD COLUMN validationNotes TEXT AFTER validationStatus;

-- Add verification columns to transaction_items
ALTER TABLE transaction_items 
ADD COLUMN receivedCount INT DEFAULT 0 AFTER count,
ADD COLUMN verifiedBroken INT DEFAULT 0 AFTER receivedCount,
ADD COLUMN verifiedMissing INT DEFAULT 0 AFTER verifiedBroken,
ADD COLUMN verificationNotes TEXT AFTER verifiedMissing;

-- Add verification columns to transaction_set_items
ALTER TABLE transaction_set_items 
ADD COLUMN receivedQuantity INT DEFAULT 0 AFTER quantity,
ADD COLUMN verifiedBroken INT DEFAULT 0 AFTER receivedQuantity,
ADD COLUMN verifiedMissing INT DEFAULT 0 AFTER verifiedBroken,
ADD COLUMN verificationNotes TEXT AFTER verifiedMissing;

-- Update existing transactions to set default values
UPDATE transactions SET validationStatus = 'VERIFIED' WHERE status = 'COMPLETED';
UPDATE transactions SET validationStatus = 'PENDING' WHERE status = 'PENDING';

-- =====================================================
-- PART 2: COMPREHENSIVE AUDIT LOG
-- =====================================================

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
    INDEX idx_action (action),
    INDEX idx_severity (severity)
);

-- =====================================================
-- PART 3: ENHANCED SYSTEM LOGS
-- =====================================================

-- Add tracking columns to logs table
ALTER TABLE logs 
ADD COLUMN userId VARCHAR(50) AFTER timestamp,
ADD COLUMN userName VARCHAR(100) AFTER userId,
ADD COLUMN level VARCHAR(20) DEFAULT 'INFO' AFTER userName,
ADD COLUMN category VARCHAR(50) AFTER level,
ADD COLUMN metadata JSON AFTER message;

-- Add indexes for better query performance
ALTER TABLE logs ADD INDEX idx_level (level);
ALTER TABLE logs ADD INDEX idx_category (category);
ALTER TABLE logs ADD INDEX idx_userId (userId);
ALTER TABLE logs ADD INDEX idx_timestamp (timestamp);

-- =====================================================
-- PART 4: NOTIFICATIONS SYSTEM
-- =====================================================

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
    INDEX idx_timestamp (timestamp),
    INDEX idx_severity (severity),
    INDEX idx_type (type)
);

-- =====================================================
-- PART 5: TRANSACTION APPROVAL WORKFLOW
-- =====================================================

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
    INDEX idx_transactionId (transactionId),
    INDEX idx_approvalStatus (approvalStatus),
    INDEX idx_approverUserId (approverUserId)
);

-- =====================================================
-- PART 6: DATA CHANGE HISTORY
-- =====================================================

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
    INDEX idx_timestamp (timestamp),
    INDEX idx_changedBy (changedBy),
    INDEX idx_changeType (changeType)
);

-- =====================================================
-- PART 7: DISCREPANCY TRACKING
-- =====================================================

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
    INDEX idx_transactionId (transactionId),
    INDEX idx_status (status),
    INDEX idx_severity (severity),
    INDEX idx_reportedAt (reportedAt)
);

-- =====================================================
-- PART 8: SESSION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50) NOT NULL,
    userName VARCHAR(100),
    loginAt BIGINT NOT NULL,
    logoutAt BIGINT,
    ipAddress VARCHAR(50),
    userAgent TEXT,
    sessionDuration INT,
    
    INDEX idx_userId (userId),
    INDEX idx_loginAt (loginAt),
    INDEX idx_logoutAt (logoutAt)
);

-- =====================================================
-- PART 9: SYSTEM SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(50) PRIMARY KEY,
    settingKey VARCHAR(100) UNIQUE NOT NULL,
    settingValue TEXT,
    dataType VARCHAR(20) DEFAULT 'STRING',
    description TEXT,
    updatedBy VARCHAR(100),
    updatedAt BIGINT,
    
    INDEX idx_settingKey (settingKey)
);

-- Insert default settings
INSERT INTO system_settings (id, settingKey, settingValue, dataType, description) VALUES
('set1', 'REQUIRE_PHYSICAL_VERIFICATION', 'true', 'BOOLEAN', 'Require physical item verification during transaction validation'),
('set2', 'ENABLE_APPROVAL_WORKFLOW', 'false', 'BOOLEAN', 'Enable multi-level approval workflow for high-value transactions'),
('set3', 'APPROVAL_THRESHOLD_VALUE', '1000000', 'NUMBER', 'Transaction value threshold for requiring approval (in IDR)'),
('set4', 'LOG_RETENTION_DAYS', '90', 'NUMBER', 'Number of days to retain logs before archiving'),
('set5', 'AUDIT_LOG_RETENTION_DAYS', '365', 'NUMBER', 'Number of days to retain audit logs'),
('set6', 'NOTIFICATION_RETENTION_DAYS', '30', 'NUMBER', 'Number of days to retain read notifications'),
('set7', 'AUTO_ARCHIVE_ENABLED', 'true', 'BOOLEAN', 'Enable automatic archiving of old records'),
('set8', 'DISCREPANCY_ALERT_THRESHOLD', '5', 'NUMBER', 'Percentage threshold for discrepancy alerts'),
('set9', 'SESSION_TIMEOUT_MINUTES', '60', 'NUMBER', 'User session timeout in minutes'),
('set10', 'ENABLE_EMAIL_NOTIFICATIONS', 'false', 'BOOLEAN', 'Enable email notifications for critical events');

-- =====================================================
-- PART 10: VIEWS FOR REPORTING
-- =====================================================

-- View: Transaction Discrepancy Summary
CREATE OR REPLACE VIEW v_transaction_discrepancies AS
SELECT 
    t.id AS transactionId,
    t.timestamp,
    t.type,
    t.unitId,
    u.name AS unitName,
    t.createdBy,
    t.validatedBy,
    t.validationStatus,
    COUNT(DISTINCT ti.instrumentId) AS totalItems,
    SUM(ti.verifiedBroken) AS totalBroken,
    SUM(ti.verifiedMissing) AS totalMissing,
    CASE 
        WHEN SUM(ti.verifiedBroken + ti.verifiedMissing) > 0 THEN 'HAS_DISCREPANCY'
        ELSE 'NO_DISCREPANCY'
    END AS discrepancyStatus
FROM transactions t
LEFT JOIN transaction_items ti ON t.id = ti.transactionId
LEFT JOIN units u ON t.unitId = u.id
WHERE t.status = 'COMPLETED'
GROUP BY t.id;

-- View: User Activity Summary
CREATE OR REPLACE VIEW v_user_activity_summary AS
SELECT 
    userId,
    userName,
    COUNT(*) AS totalActions,
    COUNT(DISTINCT DATE(FROM_UNIXTIME(timestamp/1000))) AS activeDays,
    MIN(timestamp) AS firstActivity,
    MAX(timestamp) AS lastActivity,
    COUNT(CASE WHEN severity = 'ERROR' THEN 1 END) AS errorCount,
    COUNT(CASE WHEN severity = 'WARNING' THEN 1 END) AS warningCount
FROM audit_logs
GROUP BY userId, userName;

-- View: Pending Validations
CREATE OR REPLACE VIEW v_pending_validations AS
SELECT 
    t.id,
    t.timestamp,
    t.type,
    t.unitId,
    u.name AS unitName,
    t.createdBy,
    t.qrCode,
    COUNT(DISTINCT ti.instrumentId) AS itemCount,
    COUNT(DISTINCT tsi.setId) AS setCount,
    TIMESTAMPDIFF(HOUR, FROM_UNIXTIME(t.timestamp/1000), NOW()) AS hoursWaiting
FROM transactions t
LEFT JOIN transaction_items ti ON t.id = ti.transactionId
LEFT JOIN transaction_set_items tsi ON t.id = tsi.transactionId
LEFT JOIN units u ON t.unitId = u.id
WHERE t.status = 'PENDING'
GROUP BY t.id
ORDER BY t.timestamp ASC;

-- =====================================================
-- PART 11: STORED PROCEDURES
-- =====================================================

DELIMITER //

-- Procedure: Log Audit Event
CREATE PROCEDURE sp_log_audit_event(
    IN p_userId VARCHAR(50),
    IN p_userName VARCHAR(100),
    IN p_action VARCHAR(50),
    IN p_entityType VARCHAR(50),
    IN p_entityId VARCHAR(50),
    IN p_changes JSON,
    IN p_ipAddress VARCHAR(50),
    IN p_userAgent TEXT,
    IN p_severity VARCHAR(20)
)
BEGIN
    INSERT INTO audit_logs (
        id, timestamp, userId, userName, action, entityType, 
        entityId, changes, ipAddress, userAgent, severity
    ) VALUES (
        CONCAT('AUD-', UUID()),
        UNIX_TIMESTAMP() * 1000,
        p_userId,
        p_userName,
        p_action,
        p_entityType,
        p_entityId,
        p_changes,
        p_ipAddress,
        p_userAgent,
        COALESCE(p_severity, 'INFO')
    );
END //

-- Procedure: Create Notification
CREATE PROCEDURE sp_create_notification(
    IN p_userId VARCHAR(50),
    IN p_type VARCHAR(50),
    IN p_title VARCHAR(200),
    IN p_message TEXT,
    IN p_severity VARCHAR(20),
    IN p_entityType VARCHAR(50),
    IN p_entityId VARCHAR(50),
    IN p_actionUrl VARCHAR(200)
)
BEGIN
    INSERT INTO notifications (
        id, timestamp, userId, type, title, message, severity,
        relatedEntityType, relatedEntityId, actionUrl, createdAt
    ) VALUES (
        CONCAT('NOT-', UUID()),
        UNIX_TIMESTAMP() * 1000,
        p_userId,
        p_type,
        p_title,
        p_message,
        COALESCE(p_severity, 'INFO'),
        p_entityType,
        p_entityId,
        p_actionUrl,
        UNIX_TIMESTAMP() * 1000
    );
END //

-- Procedure: Archive Old Logs
CREATE PROCEDURE sp_archive_old_logs(
    IN p_retentionDays INT
)
BEGIN
    DECLARE v_cutoffTimestamp BIGINT;
    SET v_cutoffTimestamp = (UNIX_TIMESTAMP() - (p_retentionDays * 24 * 60 * 60)) * 1000;
    
    -- Archive to backup table (create if not exists)
    CREATE TABLE IF NOT EXISTS logs_archive LIKE logs;
    
    INSERT INTO logs_archive 
    SELECT * FROM logs WHERE timestamp < v_cutoffTimestamp;
    
    DELETE FROM logs WHERE timestamp < v_cutoffTimestamp;
    
    SELECT CONCAT('Archived ', ROW_COUNT(), ' log records') AS result;
END //

DELIMITER ;

-- =====================================================
-- PART 12: TRIGGERS
-- =====================================================

DELIMITER //

-- Trigger: Auto-log instrument updates
CREATE TRIGGER trg_instrument_update_history
AFTER UPDATE ON instruments
FOR EACH ROW
BEGIN
    IF OLD.totalStock != NEW.totalStock THEN
        INSERT INTO instrument_history (id, instrumentId, timestamp, changeType, fieldName, oldValue, newValue)
        VALUES (CONCAT('HIS-', UUID()), NEW.id, UNIX_TIMESTAMP() * 1000, 'UPDATE', 'totalStock', OLD.totalStock, NEW.totalStock);
    END IF;
    
    IF OLD.cssdStock != NEW.cssdStock THEN
        INSERT INTO instrument_history (id, instrumentId, timestamp, changeType, fieldName, oldValue, newValue)
        VALUES (CONCAT('HIS-', UUID()), NEW.id, UNIX_TIMESTAMP() * 1000, 'UPDATE', 'cssdStock', OLD.cssdStock, NEW.cssdStock);
    END IF;
    
    IF OLD.dirtyStock != NEW.dirtyStock THEN
        INSERT INTO instrument_history (id, instrumentId, timestamp, changeType, fieldName, oldValue, newValue)
        VALUES (CONCAT('HIS-', UUID()), NEW.id, UNIX_TIMESTAMP() * 1000, 'UPDATE', 'dirtyStock', OLD.dirtyStock, NEW.dirtyStock);
    END IF;
    
    IF OLD.brokenStock != NEW.brokenStock THEN
        INSERT INTO instrument_history (id, instrumentId, timestamp, changeType, fieldName, oldValue, newValue)
        VALUES (CONCAT('HIS-', UUID()), NEW.id, UNIX_TIMESTAMP() * 1000, 'UPDATE', 'brokenStock', OLD.brokenStock, NEW.brokenStock);
    END IF;
END //

DELIMITER ;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created
SELECT 
    'audit_logs' AS table_name, 
    COUNT(*) AS row_count 
FROM audit_logs
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'transaction_approvals', COUNT(*) FROM transaction_approvals
UNION ALL
SELECT 'instrument_history', COUNT(*) FROM instrument_history
UNION ALL
SELECT 'discrepancy_reports', COUNT(*) FROM discrepancy_reports
UNION ALL
SELECT 'user_sessions', COUNT(*) FROM user_sessions
UNION ALL
SELECT 'system_settings', COUNT(*) FROM system_settings;

-- Check if columns were added
DESCRIBE transactions;
DESCRIBE transaction_items;
DESCRIBE transaction_set_items;
DESCRIBE logs;

-- =====================================================
-- ROLLBACK SCRIPT (Use only if needed)
-- =====================================================

/*
-- To rollback this migration, run:

ALTER TABLE transactions 
DROP COLUMN validatedAt,
DROP COLUMN validationStatus,
DROP COLUMN validationNotes;

ALTER TABLE transaction_items 
DROP COLUMN receivedCount,
DROP COLUMN verifiedBroken,
DROP COLUMN verifiedMissing,
DROP COLUMN verificationNotes;

ALTER TABLE transaction_set_items 
DROP COLUMN receivedQuantity,
DROP COLUMN verifiedBroken,
DROP COLUMN verifiedMissing,
DROP COLUMN verificationNotes;

ALTER TABLE logs 
DROP COLUMN userId,
DROP COLUMN userName,
DROP COLUMN level,
DROP COLUMN category,
DROP COLUMN metadata;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS transaction_approvals;
DROP TABLE IF EXISTS instrument_history;
DROP TABLE IF EXISTS discrepancy_reports;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS system_settings;

DROP VIEW IF EXISTS v_transaction_discrepancies;
DROP VIEW IF EXISTS v_user_activity_summary;
DROP VIEW IF EXISTS v_pending_validations;

DROP PROCEDURE IF EXISTS sp_log_audit_event;
DROP PROCEDURE IF EXISTS sp_create_notification;
DROP PROCEDURE IF EXISTS sp_archive_old_logs;

DROP TRIGGER IF EXISTS trg_instrument_update_history;
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================
