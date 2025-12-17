const db = require('./db');

async function checkUnits() {
    console.log("🔍 Checking Units Data in Local DB...");
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query("SELECT id, name, type, qrCode FROM units");
        console.table(rows);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

checkUnits();
