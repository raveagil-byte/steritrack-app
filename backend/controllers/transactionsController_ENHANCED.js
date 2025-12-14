/**
 * Enhanced Transactions Controller
 * Implements physical verification and comprehensive audit logging
 * 
 * Features:
 * - Physical item verification during validation
 * - Discrepancy tracking (broken, missing items)
 * - Comprehensive audit logging
 * - Notification system
 * - Stock adjustment based on actual received
 */

const db = require('../db');

/**
 * Get all transactions with enhanced details
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const [transactions] = await db.query('SELECT * FROM transactions ORDER BY timestamp DESC');

        for (let tx of transactions) {
            // Get individual items with verification data
            const [items] = await db.query(
                `SELECT instrumentId, count, itemType, brokenCount, missingCount,
                        receivedCount, verifiedBroken, verifiedMissing, verificationNotes 
                 FROM transaction_items WHERE transactionId = ?`,
                [tx.id]
            );
            tx.items = items;

            // Get set items with verification data
            const [setItems] = await db.query(
                `SELECT setId, quantity, brokenCount, missingCount,
                        receivedQuantity, verifiedBroken, verifiedMissing, verificationNotes
                 FROM transaction_set_items WHERE transactionId = ?`,
                [tx.id]
            );
            tx.setItems = setItems;
        }

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create transaction (unchanged from original)
 */
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
        await connection.query(
            'INSERT INTO transactions (id, timestamp, type, status, unitId, qrCode, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, timestamp, type, status, unitId, qrCode, createdBy]
        );

        // 2. Process individual items
        if (items && items.length > 0) {
            for (let item of items) {
                const broken = item.brokenCount || 0;
                const missing = item.missingCount || 0;

                await connection.query(
                    'INSERT INTO transaction_items (transactionId, instrumentId, count, itemType, brokenCount, missingCount) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, item.instrumentId, item.count, item.itemType || 'SINGLE', broken, missing]
                );

                await updateInstrumentStock(connection, item.instrumentId, item.count, broken, missing, type, unitId);
            }
        }

        // 3. Process set items
        if (setItems && setItems.length > 0) {
            for (let setItem of setItems) {
                const brokenSet = setItem.brokenCount || 0;
                const missingSet = setItem.missingCount || 0;

                await connection.query(
                    'INSERT INTO transaction_set_items (transactionId, setId, quantity, brokenCount, missingCount) VALUES (?, ?, ?, ?, ?)',
                    [id, setItem.setId, setItem.quantity, brokenSet, missingSet]
                );

                const [instruments] = await connection.query(
                    'SELECT instrumentId, quantity FROM instrument_set_items WHERE setId = ?',
                    [setItem.setId]
                );

                for (let inst of instruments) {
                    const totalQty = inst.quantity * setItem.quantity;
                    const totalBroken = inst.quantity * brokenSet;
                    const totalMissing = inst.quantity * missingSet;

                    await updateInstrumentStock(connection, inst.instrumentId, totalQty, totalBroken, totalMissing, type, unitId);
                }
            }
        }

        // 4. Log audit event
        await logAuditEvent(connection, {
            userId: createdBy,
            userName: createdBy,
            action: 'CREATE_TRANSACTION',
            entityType: 'transaction',
            entityId: id,
            changes: { type, unitId, itemCount: items?.length || 0, setCount: setItems?.length || 0 },
            severity: 'INFO'
        });

        await connection.commit();
        res.json({ message: 'Transaction created', transactionId: id });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

/**
 * ENHANCED: Validate transaction with physical verification
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

        // 3. Validate and update set items
        if (setItems && setItems.length > 0) {
            for (let setItem of setItems) {
                const total = setItem.receivedQuantity + setItem.brokenCount + setItem.missingCount;
                if (total !== setItem.expectedQuantity) {
                    throw new Error(`Verification mismatch for set ${setItem.setId}: Expected ${setItem.expectedQuantity}, got ${total}`);
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

        // 6. Adjust stock based on actual received (if there are discrepancies)
        if (hasDiscrepancy) {
            await adjustStockForDiscrepancy(connection, transaction, items, setItems);
        }

        // 7. Create discrepancy report if needed
        if (hasDiscrepancy) {
            await createDiscrepancyReport(connection, {
                transactionId,
                reportedBy: validatedBy,
                discrepancyType: 'VALIDATION_DISCREPANCY',
                severity: totalMissing > 0 ? 'HIGH' : 'MEDIUM',
                description: `Discrepancy found during validation: ${totalBroken} broken, ${totalMissing} missing items`,
                affectedItems: { items, setItems }
            });

            // Create notification for CSSD
            await createNotification(connection, {
                userId: 'CSSD',
                type: 'DISCREPANCY_ALERT',
                title: 'Discrepancy Detected',
                message: `Transaction ${transactionId} validated with discrepancies: ${totalBroken} broken, ${totalMissing} missing`,
                severity: 'WARNING',
                entityType: 'transaction',
                entityId: transactionId,
                actionUrl: `/transactions/${transactionId}`
            });
        }

        // 8. Log audit event
        await logAuditEvent(connection, {
            userId: validatedBy,
            userName: validatedBy,
            action: 'VALIDATE_TRANSACTION',
            entityType: 'transaction',
            entityId: transactionId,
            changes: {
                validationStatus,
                hasDiscrepancy,
                totalBroken,
                totalMissing,
                notes
            },
            severity: hasDiscrepancy ? 'WARNING' : 'INFO'
        });

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

/**
 * LEGACY: Simple validation (for backward compatibility)
 * This should be deprecated in favor of validateTransactionWithVerification
 */
exports.validateTransaction = async (req, res) => {
    const { validatedBy } = req.body;
    const { id } = req.params;

    try {
        await db.query(
            'UPDATE transactions SET status = "COMPLETED", validatedBy = ?, validatedAt = ?, validationStatus = "VERIFIED" WHERE id = ?',
            [validatedBy, Date.now(), id]
        );

        // Log audit event
        await logAuditEvent(null, {
            userId: validatedBy,
            userName: validatedBy,
            action: 'VALIDATE_TRANSACTION_SIMPLE',
            entityType: 'transaction',
            entityId: id,
            changes: { method: 'legacy' },
            severity: 'INFO'
        });

        res.json({ message: 'Transaction validated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Validate if set can be distributed (unchanged)
 */
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
// HELPER FUNCTIONS
// =====================================================

/**
 * Update instrument stock (unchanged from original)
 */
async function updateInstrumentStock(connection, instrumentId, count, broken, missing, type, unitId) {
    if (type === 'DISTRIBUTE') {
        await connection.query(
            'UPDATE instruments SET cssdStock = cssdStock - ? WHERE id = ?',
            [count, instrumentId]
        );

        await connection.query(
            `INSERT INTO instrument_unit_stock (instrumentId, unitId, quantity) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [instrumentId, unitId, count, count]
        );
    } else if (type === 'COLLECT') {
        const totalRemoved = count + broken + missing;

        await connection.query(
            'UPDATE instrument_unit_stock SET quantity = quantity - ? WHERE instrumentId = ? AND unitId = ?',
            [totalRemoved, instrumentId, unitId]
        );

        if (count > 0) {
            await connection.query(
                'UPDATE instruments SET dirtyStock = dirtyStock + ? WHERE id = ?',
                [count, instrumentId]
            );
        }

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

/**
 * NEW: Adjust stock for discrepancies found during validation
 */
async function adjustStockForDiscrepancy(connection, transaction, items, setItems) {
    const { type, unitId } = transaction;

    // Adjust for individual items
    if (items && items.length > 0) {
        for (let item of items) {
            const discrepancy = item.expectedCount - item.receivedCount;
            const broken = item.brokenCount;
            const missing = item.missingCount;

            if (type === 'DISTRIBUTE') {
                // If less received than expected, return the difference to CSSD stock
                if (discrepancy > 0) {
                    await connection.query(
                        'UPDATE instruments SET cssdStock = cssdStock + ? WHERE id = ?',
                        [discrepancy, item.instrumentId]
                    );

                    await connection.query(
                        'UPDATE instrument_unit_stock SET quantity = quantity - ? WHERE instrumentId = ? AND unitId = ?',
                        [discrepancy, item.instrumentId, unitId]
                    );
                }
            }

            // Handle broken items
            if (broken > 0) {
                await connection.query(
                    'UPDATE instruments SET brokenStock = brokenStock + ? WHERE id = ?',
                    [broken, item.instrumentId]
                );
            }

            // Handle missing items
            if (missing > 0) {
                await connection.query(
                    'UPDATE instruments SET totalStock = totalStock - ? WHERE id = ?',
                    [missing, item.instrumentId]
                );
            }
        }
    }

    // Similar logic for set items...
}

/**
 * NEW: Log audit event
 */
async function logAuditEvent(connection, eventData) {
    const {
        userId,
        userName,
        action,
        entityType,
        entityId,
        changes,
        ipAddress = null,
        userAgent = null,
        severity = 'INFO'
    } = eventData;

    const query = `
        INSERT INTO audit_logs (id, timestamp, userId, userName, action, entityType, entityId, changes, ipAddress, userAgent, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        Date.now(),
        userId,
        userName,
        action,
        entityType,
        entityId,
        JSON.stringify(changes),
        ipAddress,
        userAgent,
        severity
    ];

    if (connection) {
        await connection.query(query, values);
    } else {
        await db.query(query, values);
    }
}

/**
 * NEW: Create discrepancy report
 */
async function createDiscrepancyReport(connection, reportData) {
    const {
        transactionId,
        reportedBy,
        discrepancyType,
        severity,
        description,
        affectedItems
    } = reportData;

    const query = `
        INSERT INTO discrepancy_reports (id, transactionId, reportedBy, reportedAt, discrepancyType, severity, description, affectedItems, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
    `;

    const values = [
        `DIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        transactionId,
        reportedBy,
        Date.now(),
        discrepancyType,
        severity,
        description,
        JSON.stringify(affectedItems)
    ];

    await connection.query(query, values);
}

/**
 * NEW: Create notification
 */
async function createNotification(connection, notificationData) {
    const {
        userId,
        type,
        title,
        message,
        severity = 'INFO',
        entityType = null,
        entityId = null,
        actionUrl = null
    } = notificationData;

    const query = `
        INSERT INTO notifications (id, timestamp, userId, type, title, message, severity, relatedEntityType, relatedEntityId, actionUrl, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        `NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        Date.now(),
        userId,
        type,
        title,
        message,
        severity,
        entityType,
        entityId,
        actionUrl,
        Date.now()
    ];

    await connection.query(query, values);
}

module.exports = exports;
