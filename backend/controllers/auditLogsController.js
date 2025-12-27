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

/**
 * Get combined logs from Audit, Transactions, Packs, and Batches
 */
exports.getCombinedLogs = async (req, res) => {
    const { search, dateFrom, dateTo, limit = 50, page = 1 } = req.query;
    const limitVal = parseInt(limit);
    const offsetVal = (parseInt(page) - 1) * limitVal;

    // Base params for dates (used in all unions)
    let dateParams = [];
    let dateClauses = {
        audit: '',
        tx: '',
        pack: '',
        batch: ''
    };

    if (dateFrom) {
        const from = parseInt(dateFrom);
        dateClauses.audit += ' AND timestamp >= ?';
        dateClauses.tx += ' AND timestamp >= ?';
        dateClauses.pack += ' AND createdat >= ?';
        dateClauses.batch += ' AND timestamp >= ?';
        // We will push these into the main params array later
    }

    if (dateTo) {
        const to = parseInt(dateTo);
        dateClauses.audit += ' AND timestamp <= ?';
        dateClauses.tx += ' AND timestamp <= ?';
        dateClauses.pack += ' AND createdat <= ?';
        dateClauses.batch += ' AND timestamp <= ?';
    }

    // Search Clause (Wrapper based approach is better for UNION, but MySQL/PG differences make subqueries safer)
    // We will use a wrapping subquery for search/pagination for simplicity

    // Construct the 4 SELECT statements

    // 1. Audit Logs
    const qAudit = `
        SELECT id, timestamp, 'System' as source, action, severity, details, username as actor
        FROM audit_logs
        WHERE 1=1 ${dateClauses.audit}
    `;

    // 2. Transactions
    const qTx = `
        SELECT id, timestamp, 'Transaction' as source, type as action, 
        CASE WHEN status='COMPLETED' THEN 'INFO' ELSE 'WARNING' END as severity,
        CONCAT('Unit: ', unitid, ', Status: ', status) as details, 
        createdby as actor
        FROM transactions
        WHERE 1=1 ${dateClauses.tx}
    `;

    // 3. Packs
    const qPack = `
        SELECT id, createdat as timestamp, 'Packing' as source, 'PACK_CREATED' as action,
        'INFO' as severity,
        CONCAT('Pack: ', name, ', QR: ', qrcode) as details,
        packedby as actor
        FROM sterile_packs
        WHERE 1=1 ${dateClauses.pack}
    `;

    // 4. Batches
    const qBatches = `
        SELECT id, timestamp, 'Sterilization' as source, 'CYCLE_START' as action,
        CASE WHEN status='SUCCESS' THEN 'INFO' ELSE 'ERROR' END as severity,
        CONCAT('Machine: ', machine, ', Cycle: ', status) as details,
        operator as actor
        FROM sterilization_batches
        WHERE 1=1 ${dateClauses.batch}
    `;

    // Combine them
    let mainQuery = `
        SELECT * FROM (
            ${qAudit}
            UNION ALL
            ${qTx}
            UNION ALL
            ${qPack}
            UNION ALL
            ${qBatches}
        ) as combined_logs
        WHERE 1=1
    `;

    // Add Search to the outer query
    const queryParams = [];

    // Add date params for EACH of the 4 queries
    const singleQueryDateParams = [];
    if (dateFrom) singleQueryDateParams.push(parseInt(dateFrom));
    if (dateTo) singleQueryDateParams.push(parseInt(dateTo));

    // We have 4 subqueries, so request params * 4
    for (let i = 0; i < 4; i++) {
        queryParams.push(...singleQueryDateParams);
    }

    if (search) {
        mainQuery += ` AND (
            id LIKE ? OR 
            action LIKE ? OR 
            details LIKE ? OR 
            actor LIKE ?
        )`;
        const s = `%${search}%`;
        queryParams.push(s, s, s, s);
    }

    // Count Total (before pagination)
    const countQuery = `SELECT COUNT(*) as total FROM (${mainQuery.split('WHERE 1=1')[0]} WHERE 1=1 ${search ? 'AND (id LIKE ? OR action LIKE ? OR details LIKE ? OR actor LIKE ?)' : ''}) as combined_count`;
    // ^ This is a bit hacky string manipulation but works for this structure. 
    // Actually safer to run the exact same WHERE clause logic.

    // Let's execute Count first
    // Note: The count params are same as queryParams (without limit/offset)

    // Add Order and Limit to Main Query
    mainQuery += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    queryParams.push(limitVal, offsetVal);

    try {
        // Execute Data Query
        const [logs] = await db.query(mainQuery, queryParams);

        // Execute Count Query
        // For count, we need the params WITHOUT limit/offset
        const countParams = queryParams.slice(0, queryParams.length - 2);
        // We need to reconstruct the count SQL properly
        const countSql = `SELECT COUNT(*) as total FROM (
            ${qAudit}
            UNION ALL
            ${qTx}
            UNION ALL
            ${qPack}
            UNION ALL
            ${qBatches}
        ) as combined_logs
        WHERE 1=1
        ${search ? 'AND (id LIKE ? OR action LIKE ? OR details LIKE ? OR actor LIKE ?)' : ''}`;

        const [countRes] = await db.query(countSql, countParams);
        const total = countRes[0].total;

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
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
