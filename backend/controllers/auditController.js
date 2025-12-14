const db = require('../db');

exports.checkStockConsistency = async (req, res) => {
    try {
        // Query to find inconsistencies where Set Stock requirements exceed Single Stock availability
        const query = `
            SELECT 
                s.name AS setName,
                s.id AS setId,
                instruments.name AS itemName,
                instruments.id AS itemId,
                instruments.totalStock AS singleStock,
                SUM(instruments.totalStock) AS totalSingleStock, -- Just to be explicit
                -- Calculated Requirement
                (i_set.cssdStock * isi.quantity) AS requiredForSets,
                i_set.cssdStock AS setStock,
                isi.quantity AS qtyPerSet
            FROM instrument_sets s
            JOIN instrument_set_items isi ON s.id = isi.setId
            JOIN instruments ON instruments.id = isi.instrumentId
            -- Join instruments again to get the stock of the SET itself (stored as an instrument)
            JOIN instruments i_set ON i_set.name = s.name 
            WHERE 
                (i_set.cssdStock * isi.quantity) > instruments.totalStock
        `;

        // Note: The join on i_set.name = s.name is a bit fragile if names don't match exactly.
        // A better schema would link instrument_sets directly to an 'instrument' record for stock tracking.
        // But based on current migration, we have sets in 'instruments' table too.

        // Let's try a robust query based on how we migrated:
        // Sets are in 'instruments' table with category='Sets' or similar, AND in 'instrument_sets'.

        const robustQuery = `
            SELECT 
                parent_inst.name AS SetName,
                child_inst.name AS ItemName,
                parent_inst.totalStock AS SetStock,
                isi.quantity AS QtyPerSet,
                (parent_inst.totalStock * isi.quantity) AS RequiredTotal,
                child_inst.totalStock AS AvailableSingleStock
            FROM instrument_sets s
            JOIN instrument_set_items isi ON s.id = isi.setId
            -- Find the instrument record for the Set itself to get its stock
            JOIN instruments parent_inst ON parent_inst.name = s.name 
            -- Find the instrument record for the Child Item
            JOIN instruments child_inst ON child_inst.id = isi.instrumentId
            WHERE 
                (parent_inst.totalStock * isi.quantity) > child_inst.totalStock
        `;

        const [issues] = await db.query(robustQuery);

        res.json({
            status: 'success',
            issuesCount: issues.length,
            issues: issues,
            message: issues.length > 0
                ? `Ditemukan ${issues.length} ketidakwajaran stok. Stok item tunggal kurang dari kebutuhan set.`
                : "Semua stok wajar. Jumlah item fisik mencukupi untuk jumlah set yang terdata."
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
