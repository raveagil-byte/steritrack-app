const db = require('../db');

/**
 * Get audit logs with filtering
 */
exports.getAuditLogs = async (req, res) => {
    const { userId, action, entityType, severity, dateFrom, dateTo, limit = 100, page = 1, search } = req.query;

    // Construct query without SQL_CALC_FOUND_ROWS
    let query = 'SELECT * FROM audit_logs WHERE 1=1';

    // ... (rest of filtering logic effectively unchanged for the WHERE clause construction, but applied to two queries)

    // We need two queries:
    // 1. Data Query (with LIMIT/OFFSET)
    // 2. Count Query (without LIMIT/OFFSET)

    // Reconstruct Filter String
    let filterClause = '';
    const filterParams = [];

    if (search) {
        filterClause += ' AND (userName LIKE ? OR action LIKE ? OR entityType LIKE ? OR entityId LIKE ?)';
        const searchPattern = `%${search}%`;
        filterParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (userId) {
        filterClause += ' AND (userId = ? OR userName = ?)';
        filterParams.push(userId, userId);
    }

    if (action) {
        filterClause += ' AND action = ?';
        filterParams.push(action);
    }

    if (entityType) {
        filterClause += ' AND entityType = ?';
        filterParams.push(entityType);
    }

    if (severity) {
        filterClause += ' AND severity = ?';
        filterParams.push(severity);
    }

    if (dateFrom) {
        filterClause += ' AND timestamp >= ?';
        filterParams.push(parseInt(dateFrom));
    }

    if (dateTo) {
        filterClause += ' AND timestamp <= ?';
        filterParams.push(parseInt(dateTo));
    }

    // Main Query
    const dataQuery = `SELECT * FROM audit_logs WHERE 1=1 ${filterClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;

    const limitVal = parseInt(limit);
    const offsetVal = (parseInt(page) - 1) * limitVal;

    const dataParams = [...filterParams, limitVal, offsetVal];

    // Count Query
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1 ${filterClause}`;
    const countParams = [...filterParams];

    try {
        const [logs] = await db.query(dataQuery, dataParams);
        const [countResult] = await db.query(countQuery, countParams);
        const total = countResult[0].total; // Parsing is handled by db.js (int8 parser)

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
