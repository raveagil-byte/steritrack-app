const db = require('../db');

exports.getAllSets = async (req, res) => {
    try {
        const [sets] = await db.query('SELECT * FROM instrument_sets');
        for (let set of sets) {
            const [items] = await db.query('SELECT instrumentId, quantity FROM instrument_set_items WHERE setId = ?', [set.id]);
            set.items = items;
        }
        res.json(sets);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createSet = async (req, res) => {
    const { id, name, description, items } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('INSERT INTO instrument_sets (id, name, description) VALUES (?, ?, ?)', [id, name, description]);
        if (items) {
            for (let item of items) {
                await connection.query('INSERT INTO instrument_set_items (setId, instrumentId, quantity) VALUES (?, ?, ?)', [id, item.instrumentId, item.quantity]);
            }
        }
        await connection.commit();
        res.json({ message: 'Set created' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

exports.updateSet = async (req, res) => {
    const { name, description, items } = req.body;
    const setId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('UPDATE instrument_sets SET name = ?, description = ? WHERE id = ?', [name, description, setId]);

        await connection.query('DELETE FROM instrument_set_items WHERE setId = ?', [setId]);
        if (items) {
            for (let item of items) {
                await connection.query('INSERT INTO instrument_set_items (setId, instrumentId, quantity) VALUES (?, ?, ?)', [setId, item.instrumentId, item.quantity]);
            }
        }
        await connection.commit();
        res.json({ message: 'Set updated' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

exports.deleteSet = async (req, res) => {
    try {
        await db.query('DELETE FROM instrument_sets WHERE id = ?', [req.params.id]);
        res.json({ message: 'Set deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateStatus = async (req, res) => {
    const { is_active } = req.body;
    try {
        await db.query('UPDATE instrument_sets SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
