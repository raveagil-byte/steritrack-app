const db = require('./db');

async function checkStock() {
    try {
        console.log("Checking instrument_unit_stock table...");
        const [rows] = await db.query('SELECT * FROM instrument_unit_stock');
        console.log(`Found ${rows.length} rows in instrument_unit_stock.`);
        if (rows.length > 0) {
            console.table(rows);
        } else {
            console.log("Table is empty. This explains why Nurse Inventory is empty.");
        }

        console.log("\nChecking Units:");
        const [units] = await db.query('SELECT id, name FROM units');
        console.table(units);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkStock();
