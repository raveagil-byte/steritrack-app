const db = require('../db');

// Helper to chunk arrays
const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

// Process 1: Wash/Decontaminate (Dirty -> Packing)
exports.washItems = async (req, res) => {
    const { items, operator } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Process in chunks of 50 to avoid query size limits
        const chunks = chunkArray(items, 50);

        for (const chunk of chunks) {
            const ids = chunk.map(i => i.instrumentId);

            // 1. Bulk Check Stock
            const [stocks] = await connection.query('SELECT id, dirtyStock FROM instruments WHERE id IN (?)', [ids]);
            const stockMap = stocks.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.dirtyStock }), {});

            for (const item of chunk) {
                if ((stockMap[item.instrumentId] || 0) < item.quantity) {
                    throw new Error(`Stok kotor tidak cukup untuk item ID ${item.instrumentId}`);
                }
            }

            // 2. Bulk Update
            let query = 'UPDATE instruments SET dirtyStock = dirtyStock - CASE id ';
            const params = [];

            // Build DirtyStock CASE
            chunk.forEach(item => {
                query += 'WHEN ? THEN ? ';
                params.push(item.instrumentId, item.quantity);
            });

            query += 'END, packingStock = packingStock + CASE id ';

            // Build PackingStock CASE
            chunk.forEach(item => {
                query += 'WHEN ? THEN ? ';
                params.push(item.instrumentId, item.quantity);
            });

            query += 'END WHERE id IN (?)';
            params.push(ids);

            await connection.query(query, params);
        }

        await connection.query('INSERT INTO logs (id, timestamp, message, type) VALUES (UUID(), ?, ?, ?)',
            [Date.now(), `Pencucian: ${items.length} jenis item dicuci oleh ${operator}`, 'INFO']);

        await connection.commit();
        res.json({ message: 'Pencucian selesai.' });
    } catch (err) {
        await connection.rollback();
        console.error('Wash Error:', err);
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

        // Process in chunks
        const chunks = chunkArray(items, 50);

        for (const chunk of chunks) {
            const ids = chunk.map(i => i.instrumentId);

            // 1. Bulk Check Stock
            const [stocks] = await connection.query('SELECT id, packingStock FROM instruments WHERE id IN (?)', [ids]);
            const stockMap = stocks.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.packingStock }), {});

            for (const item of chunk) {
                if ((stockMap[item.instrumentId] || 0) < item.quantity) {
                    throw new Error(`Stok packing tidak cukup untuk item ID ${item.instrumentId}`);
                }
            }

            // 2. Bulk Update Logic
            let query = '';
            const params = [];

            if (status === 'FAILED') {
                // Return to Dirty
                query = 'UPDATE instruments SET packingStock = packingStock - CASE id ';
                chunk.forEach(item => { query += 'WHEN ? THEN ? '; params.push(item.instrumentId, item.quantity); });
                query += 'END, dirtyStock = dirtyStock + CASE id ';
                chunk.forEach(item => { query += 'WHEN ? THEN ? '; params.push(item.instrumentId, item.quantity); });
                query += 'END WHERE id IN (?)';
                params.push(ids);
            } else {
                // Move to CSSD
                query = 'UPDATE instruments SET packingStock = packingStock - CASE id ';
                chunk.forEach(item => { query += 'WHEN ? THEN ? '; params.push(item.instrumentId, item.quantity); });
                query += 'END, cssdStock = cssdStock + CASE id ';
                chunk.forEach(item => { query += 'WHEN ? THEN ? '; params.push(item.instrumentId, item.quantity); });
                query += 'END WHERE id IN (?)';
                params.push(ids);
            }

            await connection.query(query, params);

            // 3. Bulk Insert Batch Items
            const batchItemsValues = chunk.map(item => [batchId, item.instrumentId, item.quantity]);
            await connection.query(
                'INSERT INTO sterilization_batch_items (batchId, instrumentId, quantity) VALUES ?',
                [batchItemsValues]
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
        console.error('Sterilize Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
