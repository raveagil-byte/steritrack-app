const db = require('../db');

/**
 * Get audit logs with filtering
 */
exports.getAuditLogs = async (req, res) => {
    const { userId, action, entityType, severity, dateFrom, dateTo, limit = 100, page = 1, search } = req.query;

    let query = 'SELECT SQL_CALC_FOUND_ROWS * FROM audit_logs WHERE 1=1';
    const params = [];

    if (search) {
        query += ' AND (userName LIKE ? OR action LIKE ? OR entityType LIKE ? OR entityId LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (userId) {
        query += ' AND (userId = ? OR userName = ?)';
        params.push(userId, userId);
    }

    if (action) {
        query += ' AND action = ?';
        params.push(action);
    }

    if (entityType) {
        query += ' AND entityType = ?';
        params.push(entityType);
    }

    if (severity) {
        query += ' AND severity = ?';
        params.push(severity);
    }

    if (dateFrom) {
        query += ' AND timestamp >= ?';
        params.push(parseInt(dateFrom));
    }

    if (dateTo) {
        query += ' AND timestamp <= ?';
        params.push(parseInt(dateTo));
    }

    const limitVal = parseInt(limit);
    const offsetVal = (parseInt(page) - 1) * limitVal;

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limitVal, offsetVal);

    try {
        const [logs] = await db.query(query, params);
        const [countResult] = await db.query('SELECT FOUND_ROWS() as total');
        const total = countResult[0].total;

        res.json({
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: limitVal,
                totalPages: Math.ceil(total / limitVal)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get single audit log by ID
 */
exports.getAuditLogById = async (req, res) => {
    try {
        const [logs] = await db.query('SELECT * FROM audit_logs WHERE id = ?', [req.params.id]);
        if (logs.length === 0) {
            return res.status(404).json({ error: 'Audit log not found' });
        }
        res.json(logs[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get audit log statistics
 */
exports.getAuditStats = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN severity = 'INFO' THEN 1 ELSE 0 END) as info,
                SUM(CASE WHEN severity = 'WARNING' THEN 1 ELSE 0 END) as warning,
                SUM(CASE WHEN severity = 'ERROR' THEN 1 ELSE 0 END) as error,
                SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
                COUNT(DISTINCT userId) as uniqueUsers,
                COUNT(DISTINCT action) as uniqueActions
            FROM audit_logs
        `);
        res.json(stats[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
