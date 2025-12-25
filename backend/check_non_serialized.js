const db = require('./db');

async function checkNonSerialized() {
    try {
        console.log("=== CHECKING INSTRUMENTS TRACKING TYPE ===");

        // Count serialized vs non-serialized
        const [stats] = await db.query(`
            SELECT 
                SUM(CASE WHEN is_serialized = 1 THEN 1 ELSE 0 END) as SerializedCount,
                SUM(CASE WHEN is_serialized = 0 OR is_serialized IS NULL THEN 1 ELSE 0 END) as NonSerializedCount
            FROM instruments
        `);

        console.log(`Total Serialized (Unique QR per item): ${stats[0].SerializedCount}`);
        console.log(`Total Non-Serialized (Bulk/Quantity only): ${stats[0].NonSerializedCount}`);

        if (stats[0].NonSerializedCount > 0) {
            console.log("\n[DAFTAR INSTRUMEN TANPA QR UNIK (AUTO-GENERATED SKU ONLY)]");
            console.log("Instrumen ini dilacak berdasarkan JUMLAH, bukan scan per biji:");

            const [rows] = await db.query(`
                SELECT name, category, totalStock 
                FROM instruments 
                WHERE is_serialized = 0 OR is_serialized IS NULL 
                ORDER BY name ASC 
                LIMIT 50
            `);

            rows.forEach((row, idx) => {
                console.log(`${idx + 1}. ${row.name} (Stok: ${row.totalStock}) - Kategori: ${row.category}`);
            });

            if (stats[0].NonSerializedCount > 50) {
                console.log(`... dan ${stats[0].NonSerializedCount - 50} lainnya.`);
            }
        } else {
            console.log("Semua instrumen sudah diset sebagai Serialized (Ber-QR Unik).");
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkNonSerialized();
