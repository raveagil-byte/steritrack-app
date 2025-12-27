const db = require('../db');

// Get overdue instruments per unit
exports.getOverdueInstruments = async (req, res) => {
    try {
        const query = `
            SELECT 
                t.id as transactionId,
                t.unitid as unitId,
                u.name as unitName,
                t.timestamp,
                t.expectedreturndate as expectedReturnDate,
                ti.instrumentid as instrumentId,
                i.name as instrumentName,
                ti.count,
                ti.itemtype as itemType
            FROM transactions t
            JOIN units u ON t.unitid = u.id
            JOIN transaction_items ti ON t.id = ti.transactionid
            JOIN instruments i ON ti.instrumentid = i.id
            WHERE t.type = 'DISTRIBUTE'
            AND t.status = 'COMPLETED'
            AND t.expectedreturndate IS NOT NULL
            AND t.expectedreturndate < $1
            AND NOT EXISTS (
                SELECT 1 FROM transactions t2
                WHERE t2.type = 'COLLECT'
                AND t2.unitid = t.unitid
                AND t2.timestamp > t.timestamp
                AND EXISTS (
                    SELECT 1 FROM transaction_items ti2
                    WHERE ti2.transactionid = t2.id
                    AND ti2.instrumentid = ti.instrumentid
                )
            )
            ORDER BY t.expectedreturndate ASC
        `;

        const [rows] = await db.query(query, [Date.now()]);

        // Group by unit
        const byUnit = rows.reduce((acc, row) => {
            if (!acc[row.unitId]) {
                acc[row.unitId] = {
                    unitId: row.unitId,
                    unitName: row.unitName,
                    overdueCount: 0,
                    instruments: []
                };
            }
            acc[row.unitId].overdueCount++;
            acc[row.unitId].instruments.push({
                transactionId: row.transactionId,
                instrumentId: row.instrumentId,
                instrumentName: row.instrumentName,
                count: row.count,
                itemType: row.itemType,
                distributedAt: row.timestamp,
                expectedReturnDate: row.expectedReturnDate,
                daysOverdue: Math.floor((Date.now() - row.expectedReturnDate) / (1000 * 60 * 60 * 24))
            });
            return acc;
        }, {});

        res.json(Object.values(byUnit));
    } catch (err) {
        console.error('Error fetching overdue instruments:', err);
        res.status(500).json({ error: err.message });
    }
};

// Check if unit has overdue instruments (for blocking new distributions)
exports.checkUnitOverdue = async (req, res) => {
    const { unitId } = req.params;

    try {
        const query = `
            SELECT COUNT(*) as overdueCount
            FROM transactions t
            WHERE t.unitid = $1
            AND t.type = 'DISTRIBUTE'
            AND t.status = 'COMPLETED'
            AND t.expectedreturndate IS NOT NULL
            AND t.expectedreturndate < $2
        `;

        const [rows] = await db.query(query, [unitId, Date.now()]);
        const hasOverdue = rows[0].overdueCount > 0;

        res.json({
            unitId,
            hasOverdue,
            overdueCount: rows[0].overdueCount
        });
    } catch (err) {
        console.error('Error checking unit overdue:', err);
        res.status(500).json({ error: err.message });
    }
};
