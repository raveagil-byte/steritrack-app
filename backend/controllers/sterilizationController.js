const db = require('../db');

// Process 1: Wash/Decontaminate (Dirty -> Packing)
exports.washItems = async (req, res) => {
    const { items, operator } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        for (let item of items) {
            const [rows] = await connection.query('SELECT dirtyStock FROM instruments WHERE id = ?', [item.instrumentId]);
            if (rows.length === 0 || rows[0].dirtyStock < item.quantity) {
                throw new Error(`Stok kotor tidak cukup untuk item ${item.instrumentId}`);
            }

            await connection.query(
                'UPDATE instruments SET dirtyStock = dirtyStock - ?, packingStock = packingStock + ? WHERE id = ?',
                [item.quantity, item.quantity, item.instrumentId]
            );
        }

        await connection.query('INSERT INTO logs (id, timestamp, message, type) VALUES (UUID(), ?, ?, ?)',
            [Date.now(), `Pencucian: ${items.length} jenis item dicuci oleh ${operator}`, 'INFO']);

        await connection.commit();
        res.json({ message: 'Pencucian selesai.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

// Process 2: Sterilize (Packing -> CSSD/Sterile OR Dirty if Failed)
exports.sterilizeItems = async (req, res) => {
    const { items, operator, machine, status } = req.body; // status: 'SUCCESS' | 'FAILED'
    const batchId = `BATCH-${Date.now()}`;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const batchStatus = status === 'FAILED' ? 'FAILED' : 'COMPLETED';
        const expiryDate = status === 'FAILED' ? null : Date.now() + (180 * 24 * 60 * 60 * 1000); // 180 Days Expiry

        // Create Batch Record
        await connection.query(
            'INSERT INTO sterilization_batches (id, timestamp, operator, status, machineNumber, expiryDate) VALUES (?, ?, ?, ?, ?, ?)',
            [batchId, Date.now(), operator, batchStatus, machine || 'Autoclave 1', expiryDate]
        );

        for (let item of items) {
            // Verify stock
            const [rows] = await connection.query('SELECT packingStock FROM instruments WHERE id = ?', [item.instrumentId]);
            if (rows.length === 0 || rows[0].packingStock < item.quantity) {
                throw new Error(`Stok packing tidak cukup untuk item ${item.instrumentId}`);
            }

            if (status === 'FAILED') {
                // If failed, move back to dirtyStock (Assume re-wash/re-pack needed)
                await connection.query(
                    'UPDATE instruments SET packingStock = packingStock - ?, dirtyStock = dirtyStock + ? WHERE id = ?',
                    [item.quantity, item.quantity, item.instrumentId]
                );
            } else {
                // If success, move to cssdStock
                await connection.query(
                    'UPDATE instruments SET packingStock = packingStock - ?, cssdStock = cssdStock + ? WHERE id = ?',
                    [item.quantity, item.quantity, item.instrumentId]
                );
            }

            // Log Batch Item
            await connection.query(
                'INSERT INTO sterilization_batch_items (batchId, instrumentId, quantity) VALUES (?, ?, ?)',
                [batchId, item.instrumentId, item.quantity]
            );
        }

        const logMsg = status === 'FAILED'
            ? `Sterilisasi Batch ${batchId} GAGAL (Mesin: ${machine}). Item dikembalikan ke pencucian.`
            : `Sterilisasi Batch ${batchId} SUKSES (Mesin: ${machine}). Item siap di CSSD.`;

        await connection.query('INSERT INTO logs (id, timestamp, message, type) VALUES (UUID(), ?, ?, ?)',
            [Date.now(), logMsg, status === 'FAILED' ? 'WARNING' : 'SUCCESS']);

        await connection.commit();
        res.json({ message: 'Proses sterilisasi tercatat.', batchId, status: batchStatus, expiryDate });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
