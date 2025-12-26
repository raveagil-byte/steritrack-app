const db = require('../db');

exports.getStats = async (req, res) => {
    const connection = await db.getConnection();
    try {
        // 1. Stock Summary
        const [stockRows] = await connection.query(`
            SELECT 
                SUM(dirtyStock) as totalDirty,
                SUM(packingStock) as totalPacking,
                SUM(cssdStock) as totalSterile
            FROM instruments
        `);

        // 2. Transaction Activity (Last 7 Days)
        const [activityRows] = await connection.query(`
            SELECT 
                to_timestamp(timestamp / 1000)::date as date,
                type,
                COUNT(*) as count
            FROM transactions
            WHERE timestamp >= (EXTRACT(EPOCH FROM (NOW() - INTERVAL '7 days')) * 1000)
            GROUP BY to_timestamp(timestamp / 1000)::date, type
            ORDER BY date ASC
        `);

        // 3. Sterilization Success Rate
        const [sterileRows] = await connection.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM sterilization_batches
            GROUP BY status
        `);

        // 4. Unit Performance (Top 5 busiest units)
        const [unitRows] = await connection.query(`
            SELECT 
                u.name,
                COUNT(t.id) as txCount
            FROM units u
            LEFT JOIN transactions t ON u.id = t.unitId
            GROUP BY u.id
            ORDER BY txCount DESC
            LIMIT 5
        `);

        res.json({
            stock: stockRows[0],
            activity: activityRows,
            sterilization: sterileRows,
            topUnits: unitRows
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};
