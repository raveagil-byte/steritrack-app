const db = require('../db');

// Helper to parse instrument unit stock
const attachUnitStock = async (instruments) => {
    for (let inst of instruments) {
        const [stocks] = await db.query('SELECT unitId, quantity FROM instrument_unit_stock WHERE instrumentId = ?', [inst.id]);
        inst.unitStock = {};
        stocks.forEach(s => inst.unitStock[s.unitId] = s.quantity);
    }
    return instruments;
};

exports.getAllInstruments = async (req, res) => {
    try {
        const [instruments] = await db.query('SELECT * FROM instruments');
        const detailedInstruments = await attachUnitStock(instruments);
        res.json(detailedInstruments);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createInstrument = async (req, res) => {
    const { id, name, category, totalStock, cssdStock, dirtyStock, unitStock } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('INSERT INTO instruments (id, name, category, totalStock, cssdStock, dirtyStock) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, category, totalStock, cssdStock, dirtyStock]);

        if (unitStock) {
            for (const [unitId, qty] of Object.entries(unitStock)) {
                await connection.query('INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity) VALUES (?, ?, ?)', [id, unitId, qty]);
            }
        }
        await connection.commit();
        res.json({ message: 'Instrument created' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

exports.deleteInstrument = async (req, res) => {
    try {
        await db.query('DELETE FROM instruments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Instrument deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateInstrument = async (req, res) => {
    const { name, category } = req.body;
    try {
        await db.query('UPDATE instruments SET name = ?, category = ? WHERE id = ?', [name, category, req.params.id]);
        res.json({ message: 'Instrument updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateStatus = async (req, res) => {
    const { is_active } = req.body;
    try {
        await db.query('UPDATE instruments SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateStock = async (req, res) => {
    const { id, cssdStock, dirtyStock, unitStock } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('UPDATE instruments SET cssdStock = ?, dirtyStock = ? WHERE id = ?', [cssdStock, dirtyStock, id]);
        await connection.query('DELETE FROM instrument_unit_stock WHERE instrumentId = ?', [id]);
        if (unitStock) {
            for (const [unitId, qty] of Object.entries(unitStock)) {
                await connection.query('INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity) VALUES (?, ?, ?)', [id, unitId, qty]);
            }
        }
        await connection.commit();
        res.json({ message: 'Stock updated' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
