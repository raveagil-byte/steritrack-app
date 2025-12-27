const db = require('../db');
const { TRANSACTION_TYPES, TRANSACTION_STATUS, ITEM_TYPES } = require('../constants');

// Helper to calculate days overdue
const getDaysOverdue = (expectedDate) => {
    return Math.floor((Date.now() - expectedDate) / (1000 * 60 * 60 * 24));
};

// Get overdue instruments per unit (Enhanced with FIFO Logic and Sets Support)
exports.getOverdueInstruments = async (req, res) => {
    try {
        const now = Date.now();

        // 1. Fetch all COMPLETED DISTRIBUTIONS (Singles and Sets)
        // We fetch detailed info to track "which transaction" is overdue
        const [distItems] = await db.query(`
            SELECT 
                t.id as transactionId, t.unitid as unitId, u.name as unitName, t.timestamp, t.expectedreturndate as expectedReturnDate,
                ti.instrumentid as instrumentId, i.name as instrumentName, ti.count, '${ITEM_TYPES.SINGLE}' as itemType
            FROM transactions t
            JOIN units u ON t.unitid = u.id
            JOIN transaction_items ti ON t.id = ti.transactionid
            JOIN instruments i ON ti.instrumentid = i.id
            WHERE t.type = '${TRANSACTION_TYPES.DISTRIBUTE}' AND t.status = '${TRANSACTION_STATUS.COMPLETED}'
            ORDER BY t.timestamp ASC
        `);

        // Note: For Sets, we join instrument_sets to get the name
        const [distSets] = await db.query(`
            SELECT 
                t.id as transactionId, t.unitid as unitId, u.name as unitName, t.timestamp, t.expectedreturndate as expectedReturnDate,
                tsi.setid as instrumentId, s.name as instrumentName, tsi.quantity as count, '${ITEM_TYPES.SET}' as itemType
            FROM transactions t
            JOIN units u ON t.unitid = u.id
            JOIN transaction_set_items tsi ON t.id = tsi.transactionid
            JOIN instrument_sets s ON tsi.setid = s.id
            WHERE t.type = '${TRANSACTION_TYPES.DISTRIBUTE}' AND t.status = '${TRANSACTION_STATUS.COMPLETED}'
            ORDER BY t.timestamp ASC
        `);

        // 2. Fetch all COMPLETED COLLECTIONS (Singles and Sets)
        // We only need counts to offset the distributions
        const [collItems] = await db.query(`
            SELECT t.unitid as unitId, ti.instrumentid as instrumentId, ti.count, '${ITEM_TYPES.SINGLE}' as itemType, t.timestamp
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transactionid
            WHERE t.type = '${TRANSACTION_TYPES.COLLECT}' AND t.status = '${TRANSACTION_STATUS.COMPLETED}'
            ORDER BY t.timestamp ASC
        `);

        const [collSets] = await db.query(`
            SELECT t.unitid as unitId, tsi.setid as instrumentId, tsi.quantity as count, '${ITEM_TYPES.SET}' as itemType, t.timestamp
            FROM transactions t
            JOIN transaction_set_items tsi ON t.id = tsi.transactionid
            WHERE t.type = '${TRANSACTION_TYPES.COLLECT}' AND t.status = '${TRANSACTION_STATUS.COMPLETED}'
            ORDER BY t.timestamp ASC
        `);

        // 3. Combine and Process (FIFO Logic)
        const allDistributions = [...distItems, ...distSets].map(d => ({ ...d, remaining: d.count }));
        const allCollections = [...collItems, ...collSets];

        // Group distributions by Unique Key: Unit + Type + ID
        // This allows us to apply collections to the correct instrument 'queue'
        const distMap = new Map(); // Key -> Array of Distributions

        allDistributions.forEach(d => {
            const key = `${d.unitId}_${d.itemType}_${d.instrumentId}`;
            if (!distMap.has(key)) distMap.set(key, []);
            distMap.get(key).push(d);
        });

        // Iterate Collections and reduce remaining counts from distributions (FIFO)
        allCollections.forEach(c => {
            const key = `${c.unitId}_${c.itemType}_${c.instrumentId}`;
            const queue = distMap.get(key);

            if (queue && queue.length > 0) {
                let collectedAmount = c.count;

                for (let dist of queue) {
                    if (collectedAmount <= 0) break;

                    if (dist.remaining > 0) {
                        const deduct = Math.min(dist.remaining, collectedAmount);
                        dist.remaining -= deduct;
                        collectedAmount -= deduct;
                    }
                }
            }
        });

        // 4. Filter for Overdue Items
        // Condition: Remaining > 0 AND ExpectedDate < Now
        const overdueItems = [];
        for (const queue of distMap.values()) {
            for (const dist of queue) {
                if (dist.remaining > 0 && dist.expectedReturnDate && dist.expectedReturnDate < now) {
                    overdueItems.push({
                        transactionId: dist.transactionId,
                        instrumentId: dist.instrumentId,
                        instrumentName: dist.instrumentName,
                        count: dist.remaining, // Only show what is still outstanding
                        itemType: dist.itemType,
                        distributedAt: dist.timestamp,
                        expectedReturnDate: dist.expectedReturnDate,
                        daysOverdue: getDaysOverdue(dist.expectedReturnDate),
                        unitId: dist.unitId,
                        unitName: dist.unitName
                    });
                }
            }
        }

        // 5. Group by unit for the Frontend Response Format
        const result = overdueItems.reduce((acc, item) => {
            if (!acc[item.unitId]) {
                acc[item.unitId] = {
                    unitId: item.unitId,
                    unitName: item.unitName,
                    overdueCount: 0,
                    instruments: []
                };
            }
            acc[item.unitId].overdueCount += item.count;
            acc[item.unitId].instruments.push(item);
            return acc;
        }, {});

        res.json(Object.values(result));

    } catch (err) {
        console.error('Error fetching overdue instruments:', err);
        res.status(500).json({ error: err.message });
    }
};

// Check if unit has overdue instruments (Updated with same logic simplified)
exports.checkUnitOverdue = async (req, res) => {
    const { unitId } = req.params;
    try {
        const now = Date.now();

        // Fetch Distributions for specific unit
        const [distRows] = await db.query(`
            SELECT t.id, ti.instrumentid as instrumentId, ti.count, t.expectedreturndate, '${ITEM_TYPES.SINGLE}' as itemType
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transactionid
            WHERE t.type = '${TRANSACTION_TYPES.DISTRIBUTE}' AND t.status = '${TRANSACTION_STATUS.COMPLETED}' AND t.unitid = $1
            UNION ALL
            SELECT t.id, tsi.setid as instrumentId, tsi.quantity as count, t.expectedreturndate, '${ITEM_TYPES.SET}' as itemType
            FROM transactions t
            JOIN transaction_set_items tsi ON t.id = tsi.transactionid
            WHERE t.type = '${TRANSACTION_TYPES.DISTRIBUTE}' AND t.status = '${TRANSACTION_STATUS.COMPLETED}' AND t.unitid = $1
            ORDER BY expectedreturndate ASC
        `, [unitId]);

        // Fetch Collections for specific unit
        const [collRows] = await db.query(`
            SELECT ti.instrumentid as instrumentId, ti.count, '${ITEM_TYPES.SINGLE}' as itemType
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transactionid
            WHERE t.type = '${TRANSACTION_TYPES.COLLECT}' AND t.status = '${TRANSACTION_STATUS.COMPLETED}' AND t.unitid = $1
            UNION ALL
            SELECT tsi.setid as instrumentId, tsi.quantity as count, '${ITEM_TYPES.SET}' as itemType
            FROM transactions t
            JOIN transaction_set_items tsi ON t.id = tsi.transactionid
            WHERE t.type = '${TRANSACTION_TYPES.COLLECT}' AND t.status = '${TRANSACTION_STATUS.COMPLETED}' AND t.unitid = $1
        `, [unitId]);

        // FIFO Processing
        const distMap = new Map();
        distRows.forEach(d => {
            const key = `${d.itemType}_${d.instrumentId}`;
            if (!distMap.has(key)) distMap.set(key, []);
            distMap.get(key).push({ ...d, remaining: d.count });
        });

        collRows.forEach(c => {
            const key = `${c.itemType}_${c.instrumentId}`;
            const queue = distMap.get(key);
            if (queue) {
                let amount = c.count;
                for (let d of queue) {
                    if (amount <= 0) break;
                    const take = Math.min(d.remaining, amount);
                    d.remaining -= take;
                    amount -= take;
                }
            }
        });

        // Count Overdue
        let overdueCount = 0;
        for (let queue of distMap.values()) {
            for (let d of queue) {
                if (d.remaining > 0 && d.expectedreturndate && d.expectedreturndate < now) {
                    overdueCount += d.remaining; // Sum items (or count transactions depending on request, but user wants count)
                }
            }
        }

        res.json({
            unitId,
            hasOverdue: overdueCount > 0,
            overdueCount
        });

    } catch (err) {
        console.error('Error checking unit overdue:', err);
        res.status(500).json({ error: err.message });
    }
};
