/* eslint-disable no-undef */
// backend/controllers/usageController.js
const db = require('../db');

// Generate short ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9).toUpperCase();

// Log new usage (Link to Patient)
exports.logUsage = async (req, res) => {
    const { unitId, patientId, doctorName, items, notes, patientName, procedureId } = req.body;
    const user = req.user; // From authMiddleware

    if (!unitId || !items || items.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const id = generateId();
    const timestamp = Date.now();
    const loggedBy = user ? user.name : 'Unknown';

    try {
        await db.query(`
            INSERT INTO usage_logs 
            (id, timestamp, unit_id, patient_id, patient_name, doctor_name, procedure_id, items, logged_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            timestamp,
            unitId,
            patientId || 'ANONYMOUS',
            patientName || '',
            doctorName || '',
            procedureId || '',
            JSON.stringify(items),
            loggedBy,
            notes || ''
        ]);

        // Construct response object
        const newLog = {
            id,
            timestamp,
            unitId,
            patientId,
            patientName,
            doctorName,
            procedureId,
            items,
            loggedBy,
            notes
        };

        res.status(201).json({ success: true, message: 'Usage recorded', data: newLog });
    } catch (error) {
        console.error('Error logging usage:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// Get usage history
exports.getUsageHistory = async (req, res) => {
    try {
        const { unitId } = req.query;
        let sql = 'SELECT * FROM usage_logs';
        const params = [];

        if (unitId) {
            sql += ' WHERE unit_id = ?';
            params.push(unitId);
        }

        sql += ' ORDER BY timestamp DESC LIMIT 100';

        const [rows] = await db.query(sql, params);

        // Parse items JSON
        const results = rows.map(row => ({
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
        }));

        res.json(results);
    } catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get details of a specific usage record
exports.getUsageById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM usage_logs WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Log not found' });

        const row = rows[0];
        const result = {
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching usage by ID:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
