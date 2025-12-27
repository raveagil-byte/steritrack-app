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

        // Separate IDs to check if they are Assets or Master
        const allIds = items.map(i => i.instrumentId);

        // Check for Assets
        // Note: In Postgres/MySQL, we need to handle case sensitivity if needed, but assuming exact match
        const [assets] = await connection.query('SELECT id, instrumentid, status FROM instrument_assets WHERE id = ANY(?)', [allIds]);

        const assetMap = {};
        assets.forEach(a => { assetMap[a.id] = a; });

        const masterItemsToUpdate = []; // { id, quantity }
        const assetsToUpdate = [];      // IDs

        for (const item of items) {
            if (assetMap[item.instrumentId]) {
                // It is an ASSET
                // Logic: 
                // 1. Asset Status Update (DIRTY -> PACKING)
                // 2. Master Stock Update (Dirty -> Packing)
                const asset = assetMap[item.instrumentId];

                // Optional: Check current status?
                // if (asset.status !== 'DIRTY' && asset.status !== 'USED') { ... }

                assetsToUpdate.push(item.instrumentId);

                // Add to Master Counter
                masterItemsToUpdate.push({ instrumentId: asset.instrumentid, quantity: item.quantity }); // usually 1
            } else {
                // It is likely a MASTER Item (legacy/bulk)
                masterItemsToUpdate.push(item);
            }
        }

        // --- UPDATE 1: ASSETS STATUS ---
        if (assetsToUpdate.length > 0) {
            await connection.query(
                "UPDATE instrument_assets SET status = 'PACKING', updatedat = ? WHERE id = ANY(?)",
                [Date.now(), assetsToUpdate]
            );
        }

        // --- UPDATE 2: MASTER STOCK COUNTERS (Aggregated) ---
        // We aggregate the updates to avoid multiple updates to same row
        const aggregatedUpdates = {};
        masterItemsToUpdate.forEach(item => {
            if (!aggregatedUpdates[item.instrumentId]) aggregatedUpdates[item.instrumentId] = 0;
            aggregatedUpdates[item.instrumentId] += item.quantity;
        });

        const uniqueMasterIds = Object.keys(aggregatedUpdates);

        if (uniqueMasterIds.length > 0) {
            // Process in chunks of 50
            const masterChunks = chunkArray(uniqueMasterIds, 50);

            for (const chunkIds of masterChunks) {
                // 1. Check Stock
                const [stocks] = await connection.query('SELECT id, dirtyStock FROM instruments WHERE id = ANY(?)', [chunkIds]);
                const stockMap = stocks.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.dirtyStock }), {});

                for (const mId of chunkIds) {
                    const requiredQty = aggregatedUpdates[mId];
                    // If stockMap[mId] is undefined, it means the Master ID doesn't exist.
                    // If it's undefined, let's treat it as 0
                    const available = stockMap[mId] || 0;

                    if (available < requiredQty) {
                        // Allow force wash if it's an Asset? 
                        // If we scanned a real Asset, it physically exists. The 'dirtyStock' counter might be out of sync.
                        // Ideally we should TRUST the Asset Scan and auto-correct or ignore the counter limit.
                        // BUT explicitly for Master (Bulk) requests, we must enforce limit.

                        // Decision: For this fix, strictly enforce. But give better error.
                        throw new Error(`Stok kotor tidak cukup untuk Master Item ID ${mId} (Butuh: ${requiredQty}, Ada: ${available})`);
                    }
                }

                // 2. Update Stock
                let query = 'UPDATE instruments SET dirtyStock = dirtyStock - CASE id ';
                const params = [];

                chunkIds.forEach(mId => {
                    query += 'WHEN ? THEN ? ';
                    params.push(mId, aggregatedUpdates[mId]);
                });

                query += 'END, packingStock = packingStock + CASE id ';

                chunkIds.forEach(mId => {
                    query += 'WHEN ? THEN ? ';
                    params.push(mId, aggregatedUpdates[mId]);
                });

                query += 'END WHERE id = ANY(?)';
                params.push(chunkIds);

                await connection.query(query, params);
            }
        }

        await connection.query('INSERT INTO logs (id, timestamp, message, type) VALUES (UUID(), ?, ?, ?)',
            [Date.now(), `Pencucian: ${items.length} item (Termasuk ${assetsToUpdate.length} aset serial) dicuci oleh ${operator}`, 'INFO']);

        await connection.commit();
        res.json({ message: 'Pencucian selesai.', assetsUpdated: assetsToUpdate.length });
    } catch (err) {
        await connection.rollback();
        console.error('Wash Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

// Process 2: Sterilize (Packing -> CSSD/Sterile OR Dirty if Failed)
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
            'INSERT INTO sterilization_batches (id, timestamp, operator, status, machine, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [batchId, Date.now(), operator, batchStatus, machine || 'Autoclave 1', Date.now(), Date.now()]
        );

        // Separate Assets vs Master
        const allIds = items.map(i => i.instrumentId);
        const [assets] = await connection.query('SELECT id, instrumentid, status FROM instrument_assets WHERE id = ANY(?)', [allIds]);

        const assetMap = {};
        assets.forEach(a => { assetMap[a.id] = a; });

        const masterItemsToUpdate = [];
        const assetsToUpdate = [];

        for (const item of items) {
            if (assetMap[item.instrumentId]) {
                const asset = assetMap[item.instrumentId];
                assetsToUpdate.push(item.instrumentId);
                masterItemsToUpdate.push({ instrumentId: asset.instrumentid, quantity: item.quantity });
            } else {
                masterItemsToUpdate.push(item);
            }
        }

        // --- UPDATE 1: ASSETS STATUS ---
        if (assetsToUpdate.length > 0) {
            const newStatus = status === 'FAILED' ? 'DIRTY' : 'READY'; // READY = Sterile/In CSSD
            // Note: Schema says 'READY' is default. Often 'STERILE' or 'READY' implies CSSD stock.

            await connection.query(
                "UPDATE instrument_assets SET status = ?, updatedat = ? WHERE id = ANY(?)",
                [newStatus, Date.now(), assetsToUpdate]
            );
        }

        // --- UPDATE 2: MASTER STOCK COUNTERS ---
        const aggregatedUpdates = {};
        masterItemsToUpdate.forEach(item => {
            if (!aggregatedUpdates[item.instrumentId]) aggregatedUpdates[item.instrumentId] = 0;
            aggregatedUpdates[item.instrumentId] += item.quantity;
        });

        const uniqueMasterIds = Object.keys(aggregatedUpdates);

        if (uniqueMasterIds.length > 0) {
            const chunks = chunkArray(uniqueMasterIds, 50);

            for (const chunkIds of chunks) {
                // 1. Check Packing Stock
                const [stocks] = await connection.query('SELECT id, packingStock FROM instruments WHERE id = ANY(?)', [chunkIds]);
                const stockMap = stocks.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.packingStock }), {});

                for (const mId of chunkIds) {
                    const requiredQty = aggregatedUpdates[mId];
                    const available = stockMap[mId] || 0;
                    if (available < requiredQty) {
                        throw new Error(`Stok packing tidak cukup untuk Master Item ID ${mId} (Butuh: ${requiredQty}, Ada: ${available})`);
                    }
                }

                // 2. Update Stock
                let query = '';
                const params = [];

                if (status === 'FAILED') {
                    // Return to Dirty
                    query = 'UPDATE instruments SET packingStock = packingStock - CASE id ';
                    chunkIds.forEach(mId => { query += 'WHEN ? THEN ? '; params.push(mId, aggregatedUpdates[mId]); });
                    query += 'END, dirtyStock = dirtyStock + CASE id ';
                    chunkIds.forEach(mId => { query += 'WHEN ? THEN ? '; params.push(mId, aggregatedUpdates[mId]); });
                    query += 'END WHERE id = ANY(?)';
                    params.push(chunkIds);
                } else {
                    // Move to CSSD
                    query = 'UPDATE instruments SET packingStock = packingStock - CASE id ';
                    chunkIds.forEach(mId => { query += 'WHEN ? THEN ? '; params.push(mId, aggregatedUpdates[mId]); });
                    query += 'END, cssdStock = cssdStock + CASE id ';
                    chunkIds.forEach(mId => { query += 'WHEN ? THEN ? '; params.push(mId, aggregatedUpdates[mId]); });
                    query += 'END WHERE id = ANY(?)';
                    params.push(chunkIds);
                }

                await connection.query(query, params);
            }
        }

        // 3. Insert Batch Items (Keep original IDs for traceability - even if Asset ID)
        // Note: Batch Items table is generic, can store Asset ID or Master ID
        if (items.length > 0) {
            // FIX: Manual expansion for bulk insert
            const valuesPlaceholders = items.map(() => '(?, ?, ?)').join(', ');
            const flatParams = items.flatMap(item => [batchId, item.instrumentId, item.quantity]);

            await connection.query(
                `INSERT INTO sterilization_batch_items (batchId, itemId, quantity) VALUES ${valuesPlaceholders}`,
                flatParams
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
