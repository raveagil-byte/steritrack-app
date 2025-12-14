const db = require('../db');

exports.createPack = async (req, res) => {
    const { items, type, name, packedBy, targetUnitId } = req.body;
    // items: [{ instrumentId: 'i1', quantity: 5, type: 'SINGLE' }, ...]

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const packId = `PCK - ${Date.now()} `;
        const qrCode = packId;
        const createdAt = Date.now();
        const expiresAt = createdAt + (180 * 24 * 60 * 60 * 1000); // 6 months standard

        await connection.query(
            'INSERT INTO sterile_packs (id, name, type, status, targetUnitId, createdAt, packedBy, expiresAt, qrCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [packId, name || `Pack ${packId} `, type || 'SINGLE_ITEMS', 'PACKED', targetUnitId || null, createdAt, packedBy, expiresAt, qrCode]
        );

        if (items && items.length > 0) {
            for (const item of items) {
                // 1. Insert into pack contents
                await connection.query(
                    'INSERT INTO sterile_pack_items (packId, instrumentId, itemType, quantity) VALUES (?, ?, ?, ?)',
                    [packId, item.instrumentId, item.type || 'SINGLE', item.quantity]
                );

                // 2. STOCK MOVEMENT: Deduct from packingStock
                // We only track stock for SINGLE/Loose instruments.
                // If it's a SET, we might need to deduct the Set stock?
                // For now, let's assume Sets are treated as single logical items that also have stock,
                // or if tracking components, we deduct components.
                // Given the simple schema, Instruments (Category=Sets) have 'totalStock' etc.

                // Check if stock exists
                const [rows] = await connection.query('SELECT packingStock FROM instruments WHERE id = ?', [item.instrumentId]);
                if (rows.length === 0 || rows[0].packingStock < item.quantity) {
                    throw new Error(`Stok packing tidak cukup untuk ${item.instrumentId} `);
                }

                await connection.query(
                    'UPDATE instruments SET packingStock = packingStock - ? WHERE id = ?',
                    [item.quantity, item.instrumentId]
                );
            }
        }

        await connection.commit();
        res.json({
            message: 'Pack created successfully',
            packId,
            qrCode,
            createdAt,
            expiresAt,
            packedBy
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

exports.getAllPacks = async (req, res) => {
    try {
        // Sort by FIFO (Oldest first) for easier distribution logic on frontend if needed
        const [packs] = await db.query('SELECT * FROM sterile_packs ORDER BY createdAt ASC');
        for (const pack of packs) {
            const [items] = await db.query('SELECT * FROM sterile_pack_items WHERE packId = ?', [pack.id]);
            pack.items = items;
        }
        res.json(packs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPack = async (req, res) => {
    try {
        const [packs] = await db.query('SELECT * FROM sterile_packs WHERE id = ? OR qrCode = ?', [req.params.id, req.params.id]);
        if (packs.length === 0) return res.status(404).json({ error: 'Pack not found' });

        const pack = packs[0];
        const [items] = await db.query('SELECT * FROM sterile_pack_items WHERE packId = ?', [pack.id]);
        pack.items = items;

        // FIFO CHECK: Check if there are older packs with same Name/Type that are still valid
        if (pack.status === 'STERILIZED' || pack.status === 'PACKED') {
            // Extract base name to ignore suffixes like [Date-ID] or (qty pcs)
            let baseName = pack.name;
            // Remove [123456-123] suffix
            baseName = baseName.replace(/\s*\[.*?\]$/, '');
            // Remove (10 pcs) suffix
            baseName = baseName.replace(/\s*\(.*?pcs\)$/, '');
            baseName = baseName.trim();

            // Only search if we have a valid base name
            if (baseName.length > 0) {
                const [olderPacks] = await db.query(
                    `SELECT id, name, createdAt FROM sterile_packs 
                     WHERE name LIKE ?
    AND status = ?
        AND createdAt < ?
            AND id != ?
                ORDER BY createdAt ASC LIMIT 1`,
                    [`${baseName}% `, pack.status, pack.createdAt, pack.id]
                );

                if (olderPacks.length > 0) {
                    pack.fifoWarning = {
                        hasOlder: true,
                        olderPack: olderPacks[0]
                    };
                }
            }
        }

        res.json(pack);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sterilizePack = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check current status
        const [rows] = await connection.query('SELECT status FROM sterile_packs WHERE id = ?', [id]);
        if (rows.length === 0) throw new Error('Pack not found');
        if (rows[0].status === 'STERILIZED') throw new Error('Pack already sterilized');

        // Update status
        await connection.query('UPDATE sterile_packs SET status = "STERILIZED" WHERE id = ?', [id]);

        // STOCK MOVEMENT: Add to cssdStock
        // When a pack is sterilized, its contents become available as "Sterile" (CSSD Stock).
        // This allows them to be distributed using standard transaction logic.
        const [items] = await connection.query('SELECT instrumentId, quantity FROM sterile_pack_items WHERE packId = ?', [id]);

        for (const item of items) {
            await connection.query(
                'UPDATE instruments SET cssdStock = cssdStock + ? WHERE id = ?',
                [item.quantity, item.instrumentId]
            );
        }

        await connection.commit();
        res.json({ message: 'Pack marked as sterilized and stock updated.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
