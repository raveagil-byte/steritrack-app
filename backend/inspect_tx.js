const db = require('./db');

async function inspectTransaction(txId) {
    try {
        console.log(`=== INSPEKSI TRANSAKSI: ${txId} ===\n`);

        // 1. Header Transaksi
        const [tx] = await db.query('SELECT * FROM transactions WHERE id = ?', [txId]);
        if (tx.length === 0) {
            console.log("Transaksi TIDAK DITEMUKAN di database.");
            return;
        }
        console.log("Header:", tx[0]);

        // 2. Items
        const [items] = await db.query('SELECT * FROM transaction_items WHERE transactionId = ?', [txId]);
        console.log("\nItems:");
        console.table(items);

        // 3. Cek Unit ID apakah cocok dengan tabel units
        const [unit] = await db.query('SELECT * FROM units WHERE id = ?', [tx[0].unitId]);
        console.log("\nUnit Info:", unit[0] ? "Valid" : "INVALID UNIT ID!");
        if (unit[0]) console.log(unit[0]);

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectTransaction('a35b6284-dc67-40bd-b9f9-991ead5f6c65');
