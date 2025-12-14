const db = require('../db');

// Helper to optimized attachUnitStock
const attachUnitStock = async (instruments) => {
    // Optimized: fetch all unit stocks in one query
    const [allStocks] = await db.query('SELECT instrumentId, unitId, quantity FROM instrument_unit_stock');

    // Group by instrumentId
    const stockMap = {};
    allStocks.forEach(s => {
        if (!stockMap[s.instrumentId]) stockMap[s.instrumentId] = {};
        stockMap[s.instrumentId][s.unitId] = s.quantity;
    });

    instruments.forEach(inst => {
        inst.unitStock = stockMap[inst.id] || {};
    });
    return instruments;
};

exports.getAllInstruments = async (req, res) => {
    try {
        const [instruments] = await db.query('SELECT * FROM instruments');
        const [sets] = await db.query('SELECT id, name FROM instrument_sets');
        const [recipes] = await db.query('SELECT * FROM instrument_set_items');

        // 1. Map Set Definition ID -> Set Name (normalized)
        const setNames = {};
        sets.forEach(s => setNames[s.id] = s.name.toLowerCase());

        // 2. Map Set Name -> Set Total Stock (from instruments table)
        // Normalized to lowercase for matching
        const setStocks = {};
        instruments.filter(i => i.category === 'Sets').forEach(i => {
            setStocks[i.name.toLowerCase()] = i.totalStock;
        });

        // 3. Calculate Usage
        const instrumentUsage = {}; // instrumentId -> count
        recipes.forEach(r => {
            const setName = setNames[r.setId]; // already lowercased
            if (setName) {
                const parentStock = setStocks[setName] || 0;
                // Accumulate usage: items per set * number of sets
                instrumentUsage[r.instrumentId] = (instrumentUsage[r.instrumentId] || 0) + (r.quantity * parentStock);
            }
        });

        // 4. Attach to output
        const detailedInstruments = await attachUnitStock(instruments);

        const finalResult = detailedInstruments.map(inst => {
            const used = instrumentUsage[inst.id] || 0;
            // Only 'Single' items can be inside sets, but we calculate for all just in case
            return {
                ...inst,
                usedInSets: used,
                remainingLoose: Math.max(0, inst.totalStock - used)
            };
        });

        res.json(finalResult);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getUnassignedInstruments = async (req, res) => {
    try {
        const query = `
            SELECT i.* 
            FROM instruments i
            WHERE i.id NOT IN (
                SELECT DISTINCT instrumentId 
                FROM instrument_set_items
            )
            AND i.is_active = 1
        `;
        const [instruments] = await db.query(query);
        res.json(instruments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createInstrument = async (req, res) => {
    const { id, name, category, totalStock, cssdStock, dirtyStock, unitStock, is_serialized } = req.body;
    const connection = await db.getConnection();
    try {
        // Check if instrument with same name already exists
        const [existing] = await connection.query('SELECT id, name FROM instruments WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({
                error: 'Nama instrumen sudah ada',
                message: `Instrumen dengan nama "${name}" sudah terdaftar di sistem.`
            });
        }

        await connection.beginTransaction();
        await connection.query('INSERT INTO instruments (id, name, category, totalStock, cssdStock, dirtyStock, is_serialized) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, name, category, totalStock, cssdStock, dirtyStock, is_serialized || false]);

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
    const { name, category, is_serialized, totalStock, cssdStock, dirtyStock, packingStock } = req.body;
    const instrumentId = req.params.id;
    try {
        // Check if another instrument with same name already exists (excluding current one)
        const [existing] = await db.query('SELECT id, name FROM instruments WHERE name = ? AND id != ?', [name, instrumentId]);
        if (existing.length > 0) {
            return res.status(400).json({
                error: 'Nama instrumen sudah ada',
                message: `Instrumen lain dengan nama "${name}" sudah terdaftar di sistem.`
            });
        }

        // If stock values are provided, update them too. Otherwise just update info.
        if (totalStock !== undefined) {
            await db.query(
                'UPDATE instruments SET name = ?, category = ?, is_serialized = ?, totalStock = ?, cssdStock = ?, dirtyStock = ?, packingStock = ? WHERE id = ?',
                [name, category, is_serialized, totalStock, cssdStock || 0, dirtyStock || 0, packingStock || 0, instrumentId]
            );
        } else {
            await db.query('UPDATE instruments SET name = ?, category = ?, is_serialized = ? WHERE id = ?',
                [name, category, is_serialized, instrumentId]);
        }

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
