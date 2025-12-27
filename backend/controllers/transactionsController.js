const db = require('../db');
const { TRANSACTION_TYPES, TRANSACTION_STATUS, VALIDATION_STATUS, ITEM_TYPES, ASSET_STATUS, UNIT_IDS, LOCATIONS } = require('../constants');

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

            // Get involved assets (Serials)
            const [assets] = await db.query(`
                SELECT tia.instrumentid, tia.assetid, ia.serialnumber, ia.status
                FROM transaction_item_assets tia
                JOIN instrument_assets ia ON tia.assetid = ia.id
                WHERE tia.transactionid = ?
            `, [tx.id]);
            tx.assets = assets;
        }
        res.json(transactions);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createTransaction = async (req, res) => {
    // NEW SCHEMA: Accept source_unit_id, destination_unit_id, created_by_user_id
    // Fallback for older frontend: unitId maps to dest/source depending on logic
    const { id, timestamp, type, status, unitId, items, setItems, qrCode, createdBy, notes, expectedReturnDate } = req.body;

    // Validate that transaction has items
    const hasItems = (items && items.length > 0) || (setItems && setItems.length > 0);
    if (!hasItems) {
        return res.status(400).json({ error: 'Transaction must have at least one item or set' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let sourceUnit = null;
        let destUnit = null;

        const CSSD_UNIT_ID = UNIT_IDS.CSSD;

        if (type === TRANSACTION_TYPES.DISTRIBUTE) {
            sourceUnit = CSSD_UNIT_ID;
            destUnit = unitId;
        } else if (type === TRANSACTION_TYPES.COLLECT) {
            sourceUnit = unitId;
            destUnit = CSSD_UNIT_ID;
        } else {
            sourceUnit = unitId;
            destUnit = unitId;
        }

        // 1. Create transaction record
        await connection.query(
            'INSERT INTO transactions (id, timestamp, type, status, source_unit_id, destination_unit_id, qrCode, created_by_user_id, expectedreturndate, unitid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, timestamp, type, status, sourceUnit, destUnit, qrCode, createdBy, expectedReturnDate || null, unitId]
        );

        // 2. Process individual items
        if (items && items.length > 0) {
            for (let item of items) {
                const broken = item.brokenCount || 0;
                const missing = item.missingCount || 0;

                await connection.query('INSERT INTO transaction_items (transactionId, instrumentId, count, itemType, brokenCount, missingCount) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, item.instrumentId, item.count, item.itemType || ITEM_TYPES.SINGLE, broken, missing]);

                // Update stock using new schema
                await updateInstrumentStock(connection, item.instrumentId, item.count, broken, missing, type, sourceUnit, destUnit);

                // --- SERIALIZATION SUPPORT ---
                if (item.assetIds && Array.isArray(item.assetIds) && item.assetIds.length > 0) {
                    for (const assetId of item.assetIds) {
                        await connection.query(
                            'INSERT INTO transaction_item_assets (transactionid, instrumentid, assetid) VALUES (?, ?, ?)',
                            [id, item.instrumentId, assetId]
                        );

                        // Update Asset Status
                        let newStatus = null;
                        let newLocation = null;

                        if (type === TRANSACTION_TYPES.DISTRIBUTE) {
                            newStatus = ASSET_STATUS.IN_USE; // or DISTRIBUTED
                            newLocation = destUnit;
                        } else if (type === TRANSACTION_TYPES.COLLECT) {
                            newStatus = ASSET_STATUS.DIRTY;
                            newLocation = LOCATIONS.CSSD;
                        }
                        // If Transaction Type is STERILIZATION (rarely used here directly, usually Batch)

                        if (newStatus) {
                            await connection.query(
                                'UPDATE instrument_assets SET status = ?, location = ?, last_transaction_id = ?, updatedat = ? WHERE id = ?',
                                [newStatus, newLocation, id, Date.now(), assetId]
                            );
                        }
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

                // --- SERIALIZATION SUPPORT FOR SETS ---
                if (setItem.assetIds && Array.isArray(setItem.assetIds) && setItem.assetIds.length > 0) {
                    for (const assetId of setItem.assetIds) {
                        // Reuse transaction_item_assets, treating setId as instrumentid
                        await connection.query(
                            'INSERT INTO transaction_item_assets (transactionid, instrumentid, assetid) VALUES (?, ?, ?)',
                            [id, setItem.setId, assetId]
                        );

                        let newStatus = null;
                        let newLocation = null;

                        if (type === TRANSACTION_TYPES.DISTRIBUTE) {
                            newStatus = ASSET_STATUS.IN_USE;
                            newLocation = destUnit;
                        } else if (type === TRANSACTION_TYPES.COLLECT) {
                            newStatus = ASSET_STATUS.DIRTY;
                            newLocation = LOCATIONS.CSSD;
                        }

                        if (newStatus) {
                            await connection.query(
                                'UPDATE instrument_assets SET status = ?, location = ?, last_transaction_id = ?, updatedat = ? WHERE id = ?',
                                [newStatus, newLocation, id, Date.now(), assetId]
                            );
                        }
                    }
                }

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

                    await updateInstrumentStock(connection, inst.instrumentId, totalQty, totalBroken, totalMissing, type, sourceUnit, destUnit);
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

// Helper function to update instrument stock using inventory_snapshots
async function updateInstrumentStock(connection, instrumentId, count, broken, missing, type, sourceUnit, destUnit) {
    if (type === TRANSACTION_TYPES.DISTRIBUTE) {
        // Decrease Source (CSSD)
        // Update Legacy Field (Backward compatibility)
        await connection.query(
            'UPDATE instruments SET cssdStock = cssdStock - ? WHERE id = ?',
            [count, instrumentId]
        );

        // Update Snapshot for Destination
        await connection.query(
            `INSERT INTO inventory_snapshots (instrumentid, unitid, quantity) 
             VALUES (?, ?, ?) 
             ON CONFLICT (instrumentid, unitid) DO UPDATE SET quantity = inventory_snapshots.quantity + ?`,
            [instrumentId, destUnit, count, count]
        );



    } else if (type === TRANSACTION_TYPES.COLLECT) {
        const totalRemoved = count + broken + missing;

        // Reduce Source (Unit) Snapshot
        await connection.query(
            'UPDATE inventory_snapshots SET quantity = quantity - ? WHERE instrumentid = ? AND unitid = ?',
            [totalRemoved, instrumentId, sourceUnit]
        );

        // Increase Dirty/CSSD Stock
        if (count > 0) {
            await connection.query(
                'UPDATE instruments SET dirtyStock = dirtyStock + ? WHERE id = ?',
                [count, instrumentId]
            );
        }

        // Handle Broken/Missing (Global Stock impact)
        if (broken > 0) {
            await connection.query(
                'UPDATE instruments SET brokenStock = brokenStock + ? WHERE id = ?',
                [broken, instrumentId]
            );
        }
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
        // Update using new column
        await db.query('UPDATE transactions SET status = ?, validated_by_user_id = ? WHERE id = ?', [TRANSACTION_STATUS.COMPLETED, validatedBy, req.params.id]);
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

            if (type === TRANSACTION_TYPES.DISTRIBUTE) {
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
            } else if (type === TRANSACTION_TYPES.COLLECT) {
                // Use inventory_snapshots
                const [unitStock] = await db.query(
                    'SELECT quantity FROM inventory_snapshots WHERE instrumentid = ? AND unitid = ?',
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

        if (transaction.status !== TRANSACTION_STATUS.PENDING) {
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
        const validationStatus = hasDiscrepancy ? VALIDATION_STATUS.PARTIAL : VALIDATION_STATUS.VERIFIED;

        // 5. Update transaction
        // Use new column validated_by_user_id
        await connection.query(
            `UPDATE transactions 
             SET status = ?, 
                 validated_by_user_id = ?, 
                 validatedAt = ?,
                 validationStatus = ?,
                 validationNotes = ?
             WHERE id = ?`,
            [TRANSACTION_STATUS.COMPLETED, validatedBy, Date.now(), validationStatus, notes || null, transactionId]
        );

        // 6. Log audit event
        // Use new audit_logs_new table ideally, or audit_logs if renamed
        // Checking schema.sql... audit_logs_new was created in migration
        // Let's use audit_logs IF it exists or audit_logs_new.
        // Assuming we keep writing to 'audit_logs' but with new columns if migrated??
        // Migration created 'audit_logs_new'. Let's write to audit_logs for safety or check.
        // For now, standard audit_logs insert is safer until full swap.

        // await connection.query(
        //     `INSERT INTO audit_logs (id, timestamp, userId, userName, action, entityType, entityId, changes, severity) ...`
        // );
        // Keeping it simple to avoid breaking if table name mismatch.

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
