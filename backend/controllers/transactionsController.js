const db = require('../db');

exports.getAllTransactions = async (req, res) => {
    try {
        const [transactions] = await db.query('SELECT * FROM transactions ORDER BY timestamp DESC');
        for (let tx of transactions) {
            // Get individual items
            const [items] = await db.query('SELECT instrumentId, count, itemType, brokenCount, missingCount FROM transaction_items WHERE transactionId = ?', [tx.id]);
            tx.items = items;

            // Get set items
            const [setItems] = await db.query('SELECT setId, quantity, brokenCount, missingCount FROM transaction_set_items WHERE transactionId = ?', [tx.id]);
            tx.setItems = setItems;

            // Get packs
            const [packs] = await db.query('SELECT packId, sp.name, sp.qrCode FROM transaction_packs tp JOIN sterile_packs sp ON tp.packId = sp.id WHERE transactionId = ?', [tx.id]);
            tx.packs = packs;

        }
        res.json(transactions);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createTransaction = async (req, res) => {
    const { id, timestamp, type, status, unitId, items, setItems, qrCode, createdBy } = req.body;

    // Validate that transaction has items
    const hasItems = (items && items.length > 0) || (setItems && setItems.length > 0);
    if (!hasItems) {
        return res.status(400).json({ error: 'Transaction must have at least one item or set' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create transaction record
        await connection.query('INSERT INTO transactions (id, timestamp, type, status, unitId, qrCode, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, timestamp, type, status, unitId, qrCode, createdBy]);

        // 2. Process individual items
        if (items && items.length > 0) {
            for (let item of items) {
                const broken = item.brokenCount || 0;
                const missing = item.missingCount || 0;

                await connection.query('INSERT INTO transaction_items (transactionId, instrumentId, count, itemType, brokenCount, missingCount) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, item.instrumentId, item.count, item.itemType || 'SINGLE', broken, missing]);

                // Update stock for individual items
                await updateInstrumentStock(connection, item.instrumentId, item.count, broken, missing, type, unitId);

                // Process Serial Numbers (Asset Tracking)
                if (item.serialNumbers && item.serialNumbers.length > 0) {
                    for (const sn of item.serialNumbers) {
                        if (!sn) continue; // Skip empty

                        // 1. Find or Create Asset
                        const [assets] = await connection.query(
                            'SELECT id FROM instrument_assets WHERE instrumentId = ? AND serialNumber = ? LIMIT 1',
                            [item.instrumentId, sn]
                        );

                        let assetId;
                        if (assets.length > 0) {
                            assetId = assets[0].id;
                        } else {
                            assetId = `AST-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
                            await connection.query(
                                'INSERT INTO instrument_assets (id, instrumentId, serialNumber, status, createdAt) VALUES (?, ?, ?, ?, ?)',
                                [assetId, item.instrumentId, sn, 'READY', Date.now()]
                            );
                        }

                        // 2. Link to Transaction
                        const detailId = `TXD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
                        await connection.query(
                            'INSERT INTO transaction_asset_details (id, transactionId, instrumentId, assetId) VALUES (?, ?, ?, ?)',
                            [detailId, id, item.instrumentId, assetId]
                        );

                        // 3. Update Asset Status and Lifecycle Count
                        const newStatus = type === 'DISTRIBUTE' ? 'IN_USE' : 'DIRTY'; // Basic status logic

                        let updateSql = 'UPDATE instrument_assets SET status = ?, updatedAt = ?, location = ?';
                        const updateParams = [newStatus, Date.now(), type === 'DISTRIBUTE' ? unitId : 'CSSD'];

                        // Increment usage count ONLY on collection (assumes 1 cycle = Distribute -> Use -> Collect)
                        if (type === 'COLLECT') {
                            updateSql += ', usageCount = usageCount + 1';
                        }

                        updateSql += ' WHERE id = ?';
                        updateParams.push(assetId);

                        await connection.query(updateSql, updateParams);
                    }
                }
            }
        }

        // 3. Process set items
        if (setItems && setItems.length > 0) {
            for (let setItem of setItems) {
                const brokenSet = setItem.brokenCount || 0;
                const missingSet = setItem.missingCount || 0;

                // Insert set transaction record
                await connection.query('INSERT INTO transaction_set_items (transactionId, setId, quantity, brokenCount, missingCount) VALUES (?, ?, ?, ?, ?)',
                    [id, setItem.setId, setItem.quantity, brokenSet, missingSet]);

                // Get all instruments in this set
                const [instruments] = await connection.query(
                    'SELECT instrumentId, quantity FROM instrument_set_items WHERE setId = ?',
                    [setItem.setId]
                );

                // Update stock for each instrument in the set
                for (let inst of instruments) {
                    const totalQty = inst.quantity * setItem.quantity; // OK sets
                    const totalBroken = inst.quantity * brokenSet;     // Broken sets
                    const totalMissing = inst.quantity * missingSet;   // Missing sets

                    await updateInstrumentStock(connection, inst.instrumentId, totalQty, totalBroken, totalMissing, type, unitId);
                }
            }
        }


        await connection.commit();
        res.json({ message: 'Transaction created' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

// Helper function to update instrument stock
async function updateInstrumentStock(connection, instrumentId, count, broken, missing, type, unitId) {
    if (type === 'DISTRIBUTE') {
        // Reduce CSSD stock (item leaving CSSD)
        await connection.query(
            'UPDATE instruments SET cssdStock = cssdStock - ? WHERE id = ?',
            [count, instrumentId]
        );

        // Increase unit stock (item arriving at unit)
        // Note: We ignore broken/missing for distribution as we assume only good items are sent
        await connection.query(
            `INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [instrumentId, unitId, count, count]
        );
    } else if (type === 'COLLECT') {
        const totalRemoved = count + broken + missing;

        // Reduce unit stock (item leaving unit)
        await connection.query(
            'UPDATE instrument_unit_stock SET quantity = quantity - ? WHERE instrumentId = ? AND unitId = ?',
            [totalRemoved, instrumentId, unitId]
        );

        // Increase dirty stock (OK items arriving at CSSD as dirty)
        if (count > 0) {
            await connection.query(
                'UPDATE instruments SET dirtyStock = dirtyStock + ? WHERE id = ?',
                [count, instrumentId]
            );
        }

        // Handle Broken: Increase brokenStock, Decrease Total Stock (effectively, as it's not in active circulation?)
        // Wait, if it's broken, it's still "stock" but not usable.
        // Let's increment brokenStock.
        if (broken > 0) {
            await connection.query(
                'UPDATE instruments SET brokenStock = brokenStock + ? WHERE id = ?',
                [broken, instrumentId]
            );
        }

        // Handle Missing: Retrieve from current Total Stock and REDUCE it?
        // Yes, missing means it's gone.
        if (missing > 0) {
            await connection.query(
                'UPDATE instruments SET totalStock = totalStock - ? WHERE id = ?',
                [missing, instrumentId]
            );
        }
    }
}


exports.validateTransaction = async (req, res) => {
    const { validatedBy } = req.body;
    try {
        await db.query('UPDATE transactions SET status = "COMPLETED", validatedBy = ? WHERE id = ?', [validatedBy, req.params.id]);
        res.json({ message: 'Transaction validated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// NEW: Validate if set can be distributed (all items available)
exports.validateSetAvailability = async (req, res) => {
    const { setId, quantity, type, unitId } = req.body;
    try {
        const [setItems] = await db.query(
            'SELECT instrumentId, quantity FROM instrument_set_items WHERE setId = ?',
            [setId]
        );

        const unavailable = [];

        for (const item of setItems) {
            const required = item.quantity * quantity;

            if (type === 'DISTRIBUTE') {
                const [instruments] = await db.query(
                    'SELECT cssdStock FROM instruments WHERE id = ?',
                    [item.instrumentId]
                );

                if (instruments.length === 0 || instruments[0].cssdStock < required) {
                    const [instInfo] = await db.query('SELECT name FROM instruments WHERE id = ?', [item.instrumentId]);
                    unavailable.push({
                        instrumentId: item.instrumentId,
                        name: instInfo[0]?.name || item.instrumentId,
                        required,
                        available: instruments[0]?.cssdStock || 0
                    });
                }
            } else if (type === 'COLLECT') {
                const [unitStock] = await db.query(
                    'SELECT quantity FROM instrument_unit_stock WHERE instrumentId = ? AND unitId = ?',
                    [item.instrumentId, unitId]
                );

                const available = unitStock[0]?.quantity || 0;
                if (available < required) {
                    const [instInfo] = await db.query('SELECT name FROM instruments WHERE id = ?', [item.instrumentId]);
                    unavailable.push({
                        instrumentId: item.instrumentId,
                        name: instInfo[0]?.name || item.instrumentId,
                        required,
                        available
                    });
                }
            }
        }

        if (unavailable.length > 0) {
            res.json({ available: false, unavailable });
        } else {
            res.json({ available: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// =====================================================
// ENHANCED VALIDATION WITH PHYSICAL VERIFICATION
// =====================================================

/**
 * NEW: Validate transaction with physical verification
 * Supports item-by-item verification with discrepancy tracking
 */
exports.validateTransactionWithVerification = async (req, res) => {
    const { transactionId } = req.params;
    const { validatedBy, items, setItems, notes } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get transaction details
        const [transactions] = await connection.query(
            'SELECT * FROM transactions WHERE id = ?',
            [transactionId]
        );

        if (transactions.length === 0) {
            throw new Error('Transaction not found');
        }

        const transaction = transactions[0];

        if (transaction.status !== 'PENDING') {
            throw new Error('Transaction is not pending validation');
        }

        // 2. Validate and update individual items
        let hasDiscrepancy = false;
        let totalBroken = 0;
        let totalMissing = 0;

        if (items && items.length > 0) {
            for (let item of items) {
                // Validate totals match
                const total = item.receivedCount + item.brokenCount + item.missingCount;
                if (total !== item.expectedCount) {
                    throw new Error(`Verification mismatch for instrument ${item.instrumentId}: Expected ${item.expectedCount}, got ${total}`);
                }

                // Update transaction_items with verification data
                await connection.query(
                    `UPDATE transaction_items 
                     SET receivedCount = ?, verifiedBroken = ?, verifiedMissing = ?, verificationNotes = ?
                     WHERE transactionId = ? AND instrumentId = ?`,
                    [item.receivedCount, item.brokenCount, item.missingCount, item.notes || null,
                        transactionId, item.instrumentId]
                );

                if (item.brokenCount > 0 || item.missingCount > 0) {
                    hasDiscrepancy = true;
                    totalBroken += item.brokenCount;
                    totalMissing += item.missingCount;
                }
            }
        }

        // 3. Validate and update set items (similar logic)
        if (setItems && setItems.length > 0) {
            for (let setItem of setItems) {
                const total = setItem.receivedQuantity + setItem.brokenCount + setItem.missingCount;
                if (total !== setItem.expectedQuantity) {
                    throw new Error(`Verification mismatch for set ${setItem.setId}`);
                }

                await connection.query(
                    `UPDATE transaction_set_items 
                     SET receivedQuantity = ?, verifiedBroken = ?, verifiedMissing = ?, verificationNotes = ?
                     WHERE transactionId = ? AND setId = ?`,
                    [setItem.receivedQuantity, setItem.brokenCount, setItem.missingCount, setItem.notes || null,
                        transactionId, setItem.setId]
                );

                if (setItem.brokenCount > 0 || setItem.missingCount > 0) {
                    hasDiscrepancy = true;
                    totalBroken += setItem.brokenCount;
                    totalMissing += setItem.missingCount;
                }
            }
        }

        // 4. Determine validation status
        const validationStatus = hasDiscrepancy ? 'PARTIAL' : 'VERIFIED';

        // 5. Update transaction
        await connection.query(
            `UPDATE transactions 
             SET status = 'COMPLETED', 
                 validatedBy = ?, 
                 validatedAt = ?,
                 validationStatus = ?,
                 validationNotes = ?
             WHERE id = ?`,
            [validatedBy, Date.now(), validationStatus, notes || null, transactionId]
        );

        // 6. Log audit event
        await connection.query(
            `INSERT INTO audit_logs (id, timestamp, userId, userName, action, entityType, entityId, changes, severity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                Date.now(),
                validatedBy,
                validatedBy,
                'VALIDATE_TRANSACTION',
                'transaction',
                transactionId,
                JSON.stringify({ validationStatus, hasDiscrepancy, totalBroken, totalMissing, notes }),
                hasDiscrepancy ? 'WARNING' : 'INFO'
            ]
        );

        await connection.commit();

        res.json({
            message: 'Transaction validated successfully',
            validationStatus,
            hasDiscrepancy,
            discrepancySummary: {
                totalBroken,
                totalMissing
            }
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
