const db = require('./db');

async function debugTransactions() {
    try {
        console.log("=== DIAGNOSA TRANSAKSI & STOK ===\n");

        // 1. Cek Transaksi
        const [txs] = await db.query('SELECT * FROM transactions LIMIT 5');
        console.log(`Found ${txs.length} transactions:`);
        console.table(txs.map(t => ({ id: t.id, type: t.type, status: t.status, unitId: t.unitId })));

        if (txs.length === 0) {
            console.log("TIDAK ADA TRANSAKSI SAMA SEKALI.");
            return process.exit(0);
        }

        // 2. Cek Item Transaksi untuk Transaksi COMPLETED
        console.log("\n=== ITEM TRANSAKSI COMPLETED ===");
        const completedTxs = txs.filter(t => t.status === 'COMPLETED' && t.type === 'DISTRIBUTION_STERILE');

        if (completedTxs.length === 0) {
            console.log("Belum ada transaksi DISTRIBUSI STERIL yang COMPLETED.");
            console.log("Stok unit HANYA bertambah jika ada Distribusi Steril yang statusnya COMPLETED.");
        } else {
            for (const tx of completedTxs) {
                console.log(`\nItems for Transaction ${tx.id} (Unit: ${tx.unitId}):`);
                const [items] = await db.query('SELECT * FROM transaction_items WHERE transactionId = ?', [tx.id]);
                console.table(items);
            }
        }

        // 3. Cek Stok Unit Aktual
        console.log("\n=== STOK UNIT AKTUAL (Tabel instrument_unit_stock) ===");
        const [stocks] = await db.query('SELECT * FROM instrument_unit_stock');
        if (stocks.length === 0) {
            console.log("Tabel STOK UNIT KOSONG!! (Ini masalahnya)");
        } else {
            console.table(stocks);
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

debugTransactions();
