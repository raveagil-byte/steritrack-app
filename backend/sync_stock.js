const db = require('./db');

async function syncStock() {
    const connection = await db.getConnection();
    try {
        console.log("=== MEMULAI SINKRONISASI STOK UNIT ===");

        await connection.beginTransaction();

        // 1. Reset Stok Unit
        console.log("1. Mereset tabel instrument_unit_stock...");
        await connection.query('DELETE FROM instrument_unit_stock');

        // 2. Ambil semua transaksi distribusi yang sukses
        console.log("2. Mengambil riwayat transaksi...");
        const [txs] = await connection.query(`
            SELECT id, unitId, type 
            FROM transactions 
            WHERE status = 'COMPLETED' 
            AND type IN ('DISTRIBUTION_STERILE', 'RETURN_DIRTY')
        `);

        console.log(`Ditemukan ${txs.length} transaksi COMPLETED.`);

        const stockMap = {}; // { "unitId_instrId": qty }

        for (const tx of txs) {
            // Ambil items
            const [items] = await connection.query('SELECT instrumentId, count FROM transaction_items WHERE transactionId = ?', [tx.id]);

            for (const item of items) {
                const key = `${tx.unitId}_${item.instrumentId}`;
                if (!stockMap[key]) stockMap[key] = 0;

                if (tx.type === 'DISTRIBUTION_STERILE') {
                    stockMap[key] += item.count;
                } else if (tx.type === 'RETURN_DIRTY') {
                    stockMap[key] -= item.count;
                }
            }
        }

        // 3. Masukkan stok yang sudah dihitung ke database
        console.log("3. Mengupdate stok unit...");
        let insertCount = 0;
        for (const [key, qty] of Object.entries(stockMap)) {
            if (qty > 0) { // Hanya simpan jika stok positif
                const [unitId, instrumentId] = key.split('_');
                await connection.query(
                    'INSERT INTO instrument_unit_stock (unitId, instrumentId, quantity) VALUES (?, ?, ?)',
                    [unitId, instrumentId, qty]
                );
                insertCount++;
            }
        }

        await connection.commit();
        console.log(`\nSUKSES! Stok unit berhasil disinkronkan.`);
        console.log(`Updated ${insertCount} stock records.`);

        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error("GAGAL:", err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

syncStock();
