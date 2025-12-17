const db = require('./db');

async function checkUnits() {
    console.log("Checking Units Data...");
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query("SELECT id, name, type, qrCode FROM units");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

checkUnits();
