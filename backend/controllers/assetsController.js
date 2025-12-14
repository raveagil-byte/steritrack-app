const db = require('../db');
const { v4: uuidv4 } = require('uuid');

exports.getAssetsByInstrument = async (req, res) => {
    try {
        const { instrumentId } = req.params;
        const [assets] = await db.query(
            'SELECT * FROM instrument_assets WHERE instrumentId = ? ORDER BY serialNumber',
            [instrumentId]
        );
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const [assets] = await db.query('SELECT * FROM instrument_assets WHERE id = ?', [id]);
        if (assets.length === 0) return res.status(404).json({ error: 'Asset not found' });
        res.json(assets[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createAsset = async (req, res) => {
    const { instrumentId, serialNumber, status, location, notes } = req.body;
    try {
        const id = `AST-${uuidv4()}`;
        const createdAt = Date.now();

        await db.query(
            `INSERT INTO instrument_assets (id, instrumentId, serialNumber, status, location, notes, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, instrumentId, serialNumber, status || 'READY', location || 'CSSD', notes, createdAt]
        );

        // Update total stock in instruments table to keep it in sync
        await db.query(
            `UPDATE instruments 
             SET totalStock = totalStock + 1, 
                 cssdStock = CASE WHEN ? = 'CSSD' THEN cssdStock + 1 ELSE cssdStock END
             WHERE id = ?`,
            [location || 'CSSD', instrumentId]
        );

        res.json({ message: 'Asset created', id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateAsset = async (req, res) => {
    const { id } = req.params;
    const { status, location, notes, usageCount, serialNumber } = req.body;

    // Build dynamic query
    let fields = [];
    let values = [];
    if (status) { fields.push('status = ?'); values.push(status); }
    if (location) { fields.push('location = ?'); values.push(location); }
    if (notes) { fields.push('notes = ?'); values.push(notes); }
    if (usageCount !== undefined) { fields.push('usageCount = ?'); values.push(usageCount); }
    if (serialNumber) { fields.push('serialNumber = ?'); values.push(serialNumber); }

    fields.push('updatedAt = ?'); values.push(Date.now());
    values.push(id); // for WHERE clause

    if (fields.length === 1) return res.json({ message: 'No changes' });

    try {
        await db.query(`UPDATE instrument_assets SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ message: 'Asset updated' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                error: 'Serial Number duplicate',
                message: 'Serial number already exists for this instrument type.'
            });
        }
        res.status(500).json({ error: err.message });
    }
};
