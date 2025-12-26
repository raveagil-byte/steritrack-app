
const db = require('./db');

async function checkUnits() {
    console.log("=== CHECKING UNITS TABLE ===");
    try {
        const [rows] = await db.query("SELECT * FROM units");
        console.log(`Row Count: ${rows.length}`);
        console.log("Data:", JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error("❌ QUERY FAILED:", err.message);
    } finally {
        process.exit();
    }
}

checkUnits();
