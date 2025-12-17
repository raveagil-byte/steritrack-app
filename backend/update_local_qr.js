const db = require('./db');

async function updateLocalQR() {
    console.log("🛠️  Updating Local QR Code for IGD...");
    const connection = await db.getConnection();
    try {
        // Update QR for ID 'u1' (standard IGD id)
        const [res] = await connection.query("UPDATE units SET qrCode = 'UNIT-IGD-0535' WHERE type = 'IGD'");
        console.log(`✅ Updated Local DB. Affected rows: ${res.affectedRows}`);

        // Verify
        const [rows] = await connection.query("SELECT id, name, qrCode FROM units WHERE type = 'IGD'");
        console.log("Current Data:", rows[0]);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

updateLocalQR();
