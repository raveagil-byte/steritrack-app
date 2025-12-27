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

exports.batchGenerate = async (req, res) => {
    const { instrumentId, prefix, count, startFrom } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const start = startFrom || 1;

        let generatedCount = 0;
        for (let i = 0; i < count; i++) {
            const num = start + i;
            const paddedNum = num.toString().padStart(3, '0');
            const serialNumber = `${prefix}-${paddedNum}`;
            const id = `AST-${require('uuid').v4()}`;
            const createdAt = Date.now();

            // Check existence logic could be here, but let's rely on DB constraint or ignore dupes
            // Using INSERT IGNORE or ON CONFLICT DO NOTHING

            await connection.query(
                `INSERT INTO instrument_assets (id, instrumentid, serialnumber, status, location, createdat)
                 VALUES (?, ?, ?, 'READY', 'CSSD', ?)
                 ON CONFLICT (instrumentid, serialnumber) DO NOTHING`,
                [id, instrumentId, serialNumber, createdAt]
            );
            generatedCount++;
        }

        // Note: Total Stock Update logic is complex here because we don't know how many actually inserted vs ignored.
        // But for safe-keeping, we should COUNT the actual assets now.

        // Recalculate total stock for this instrument based on asset count
        /*
        const [rows] = await connection.query('SELECT COUNT(*) as cnt FROM instrument_assets WHERE instrumentid = ?', [instrumentId]);
        const realCount = rows[0].cnt;
        await connection.query('UPDATE instruments SET totalStock = ? WHERE id = ?', [realCount, instrumentId]);
        */

        await connection.commit();
        res.json({ message: `Batch generation processed for ${count} items.` });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
