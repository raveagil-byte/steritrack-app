const db = require('../db');

exports.getAllRequests = async (req, res) => {
    try {
        const [requests] = await db.query('SELECT * FROM requests ORDER BY timestamp DESC');
        for (let r of requests) {
            const [items] = await db.query('SELECT itemId, itemType, quantity FROM request_items WHERE requestId = ?', [r.id]);
            r.items = items;
        }
        res.json(requests);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createRequest = async (req, res) => {
    const { id, unitId, requestedBy, items } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const timestamp = Date.now();
        await connection.query('INSERT INTO requests (id, timestamp, unitId, status, requestedBy) VALUES (?, ?, ?, ?, ?)',
            [id, timestamp, unitId, 'PENDING', requestedBy]);

        if (items) {
            for (let item of items) {
                await connection.query('INSERT INTO request_items (requestId, itemId, itemType, quantity) VALUES (?, ?, ?, ?)',
                    [id, item.itemId, item.itemType, item.quantity]);
            }
        }
        await connection.commit();
        res.json({ message: 'Request created', request: { id, timestamp } });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

exports.updateStatus = async (req, res) => {
    const { status } = req.body; // APPROVED, REJECTED
    try {
        await db.query('UPDATE requests SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Request status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
