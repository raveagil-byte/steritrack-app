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
                parent_inst.name AS "SetName",
                child_inst.name AS "ItemName",
                parent_inst."totalStock" AS "SetStock",
                isi.quantity AS "QtyPerSet",
                (parent_inst."totalStock" * isi.quantity) AS "RequiredTotal",
                child_inst."totalStock" AS "AvailableSingleStock"
            FROM instrument_sets s
            JOIN instrument_set_items isi ON s.id = isi."setId"
            -- Find the instrument record for the Set itself to get its stock (Case Insensitive Match)
            JOIN instruments parent_inst ON LOWER(parent_inst.name) = LOWER(s.name) 
            -- Find the instrument record for the Child Item
            JOIN instruments child_inst ON child_inst.id = isi."instrumentId"
            WHERE 
                (parent_inst."totalStock" * isi.quantity) > child_inst."totalStock"
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

// NEW: Submit Stock Opname (Daily Audit)
exports.submitStockOpname = async (req, res) => {
    const { id, unitId, userId, items, notes } = req.body;
    // items: [{ instrumentId, physicalQty }, ...]

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create Audit Record
        await connection.query(
            'INSERT INTO audit_stock_checks (id, unit_id, timestamp, user_id, notes) VALUES (?, ?, ?, ?, ?)',
            [id, unitId, Date.now(), userId, notes]
        );

        const results = [];

        // 2. Process Items & Calculate Discrepancy
        for (let item of items) {
            // Get System Quantity & Max Stock
            const [sysRow] = await connection.query(
                `SELECT quantity, max_stock FROM inventory_snapshots WHERE "instrumentId" = ? AND "unitId" = ?`,
                [item.instrumentId, unitId]
            );

            const systemQty = sysRow[0]?.quantity || 0;
            const maxStock = sysRow[0]?.max_stock || 100; // Default quota
            const discrepancy = item.physicalQty - systemQty;

            // Log detailed audit item
            await connection.query(
                `INSERT INTO audit_stock_check_items (audit_id, instrument_id, system_qty, physical_qty, discrepancy)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, item.instrumentId, systemQty, item.physicalQty, discrepancy]
            );

            // Optional: Auto-correct system stock if policy allows?
            // For now, we usually DON'T auto-correct. We just flag it.
            // If we wanted to auto-correct:
            /*
            if (discrepancy !== 0) {
                 await connection.query('UPDATE inventory_snapshots SET quantity = ? ...', [item.physicalQty]);
                 // And log adjustment transaction
            }
            */

            results.push({
                instrumentId: item.instrumentId,
                systemQty,
                physicalQty: item.physicalQty,
                maxStock,
                discrepancy,
                status: discrepancy === 0 ? 'MATCH' : (discrepancy > 0 ? 'SURPLUS' : 'MISSING'),
                quotaStatus: item.physicalQty > maxStock ? 'OVERSTOCK' : 'OK'
            });
        }

        await connection.commit();
        res.json({
            message: 'Stock Opname Recorded',
            auditId: id,
            summary: results.filter(r => r.discrepancy !== 0) // Return only issues
        });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
