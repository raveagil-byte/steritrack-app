const db = require('./db');

async function sedInventory() {
    const connection = await db.getConnection();
    try {
        console.log("=== SEEDING INVENTORY DUMMY FOR NURSE (OK) ===");

        // 1. Dapatkan ID Unit untuk 'u2' (Kamar Operasi) atau unit user login
        // Kita assume 'u2' adalah unit default Nurse SITI
        const unitId = 'u2';

        // 2. Dapatkan Instruments
        const [instruments] = await connection.query('SELECT id, name FROM instruments LIMIT 5');

        if (instruments.length === 0) {
            console.log("Tidak ada instrumen master. Jalankan schema.sql dulu.");
            return;
        }

        await connection.beginTransaction();

        // 3. Masukkan stok dummy
        for (const inst of instruments) {
            const qty = Math.floor(Math.random() * 10) + 5; // 5-15 items
            console.log(`Adding ${qty} of ${inst.name} to Unit ${unitId}`);

            // Upsert (Insert or Update)
            await connection.query(`
                INSERT INTO instrument_unit_stock (unitId, instrumentId, quantity)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = quantity + ?
            `, [unitId, inst.id, qty, qty]);
        }

        await connection.commit();
        console.log("\nSUKSES! Inventaris Unit Kamar Operasi telah diisi.");
        process.exit(0);

    } catch (err) {
        await connection.rollback();
        console.error(err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

sedInventory();
