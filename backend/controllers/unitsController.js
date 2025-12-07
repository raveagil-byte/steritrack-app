const db = require('../db');

exports.getAllUnits = async (req, res) => {
    try {
        const [units] = await db.query('SELECT * FROM units');
        res.json(units);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createUnit = async (req, res) => {
    const { id, name, qrCode, type } = req.body;
    try {
        await db.query('INSERT INTO units (id, name, qrCode, type) VALUES (?, ?, ?, ?)', [id, name, qrCode, type]);
        res.json({ message: 'Unit created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteUnit = async (req, res) => {
    try {
        await db.query('DELETE FROM units WHERE id = ?', [req.params.id]);
        res.json({ message: 'Unit deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateUnit = async (req, res) => {
    const { name, qrCode, type } = req.body;
    try {
        await db.query('UPDATE units SET name = ?, qrCode = ?, type = ? WHERE id = ?', [name, qrCode, type, req.params.id]);
        res.json({ message: 'Unit updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateStatus = async (req, res) => {
    const { is_active } = req.body;
    try {
        await db.query('UPDATE units SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

