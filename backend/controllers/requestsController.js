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

        // 1. Anti-Hoarding Check (Par Level)
        if (items) {
            for (let item of items) {
                // Check current stock and max_stock for this item in this unit
                const [rows] = await connection.query(
                    'SELECT quantity, max_stock FROM inventory_snapshots WHERE "instrumentId" = ? AND "unitId" = ?',
                    [item.itemId, unitId]
                );

                const currentQty = rows[0]?.quantity || 0;
                const maxStock = rows[0]?.max_stock || 100; // Default 100 if not set, or fetch from config

                const requestedQty = item.quantity;
                const projectedQty = currentQty + requestedQty;

                if (projectedQty > maxStock) {
                    throw new Error(`Anti-Hoarding: Permintaan ditolak. Item ${item.itemId} akan melebihi batas maksimal stok unit (${maxStock}). Stok saat ini: ${currentQty}.`);
                }
            }
        }

        const timestamp = Date.now();
        await connection.query('INSERT INTO requests (id, timestamp, "unitId", status, "requestedBy") VALUES (?, ?, ?, ?, ?)',
            [id, timestamp, unitId, 'PENDING', requestedBy]);

        if (items) {
            for (let item of items) {
                await connection.query('INSERT INTO request_items ("requestId", "itemId", "itemType", quantity) VALUES (?, ?, ?, ?)',
                    [id, item.itemId, item.itemType, item.quantity]);
            }
        }
        await connection.commit();
        res.json({ message: 'Request created', request: { id, timestamp } });
    } catch (err) {
        await connection.rollback();
        console.warn("Request Rejected (Anti-Hoarding):", err.message);
        res.status(400).json({ error: err.message }); // 400 Bad Request
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
