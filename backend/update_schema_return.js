const db = require('./db');

async function updateSchema() {
    try {
        console.log("Adding columns to transactions table...");

        // Add patientName
        try {
            await db.query("ALTER TABLE transactions ADD COLUMN patientName VARCHAR(100)");
            console.log("Added patientName column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("patientName column already exists.");
            else console.error(e);
        }

        // Add notes
        try {
            await db.query("ALTER TABLE transactions ADD COLUMN notes TEXT");
            console.log("Added notes column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("notes column already exists.");
            else console.error(e);
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

updateSchema();
