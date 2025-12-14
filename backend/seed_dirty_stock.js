const db = require('./db');

async function seedDirtyStock() {
    try {
        const connection = await db.getConnection();
        console.log("=== Memindahkan Stok ke 'Kotor' untuk Simulasi ===");

        // Get 5 random instruments that have cssdStock > 50
        const [instruments] = await connection.query(`
            SELECT id, name, cssdStock 
            FROM instruments 
            WHERE cssdStock > 50 
            LIMIT 5
        `);

        if (instruments.length === 0) {
            console.log("Tidak ada instrumen dengan stok steril yang cukup untuk dipindahkan.");
            process.exit(0);
        }

        for (const inst of instruments) {
            const moveQty = 50;
            await connection.query(`
                UPDATE instruments 
                SET cssdStock = cssdStock - ?, dirtyStock = dirtyStock + ? 
                WHERE id = ?
            `, [moveQty, moveQty, inst.id]);

            console.log(`> ${inst.name}: Dipindahkan ${moveQty} item dari Steril -> Kotor.`);
        }

        console.log("------------------------------------------------");
        console.log("Berhasil memindahkan stok. Anda sekarang memiliki item di 'Area Kotor' (Washing)");
        console.log("untuk mencoba alur: Cuci -> Packing -> Sterilisasi -> Distribusi.");

        connection.release();
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

seedDirtyStock();
