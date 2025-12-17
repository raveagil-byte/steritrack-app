const db = require('./db');

async function updateAllUnits() {
    console.log("🛠️  Updating/Verifying ALL Unit QR Codes...");
    const connection = await db.getConnection();
    try {
        // 1. Update IGD
        await connection.query("UPDATE units SET qrCode = 'UNIT-IGD-0535' WHERE type = 'IGD'");

        // 2. Update OK (Standardizing)
        await connection.query("UPDATE units SET qrCode = 'UNIT-OK-001' WHERE type = 'OK'");

        // 3. Update ICU (Standardizing)
        await connection.query("UPDATE units SET qrCode = 'UNIT-ICU-001' WHERE type = 'ICU'");

        console.log("✅ All Standard QR Codes applied.");

        // Verify content
        const [rows] = await connection.query("SELECT id, name, type, qrCode FROM units");
        console.table(rows);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

updateAllUnits();
