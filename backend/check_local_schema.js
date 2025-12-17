const db = require('./db');

async function checkSchema() {
    console.log("🔍 Checking LOCAL Database Schema...");
    const connection = await db.getConnection();
    try {
        const [batchesCols] = await connection.query("SHOW COLUMNS FROM sterilization_batches");
        const [itemsCols] = await connection.query("SHOW COLUMNS FROM sterilization_batch_items");

        console.log("\nTable: sterilization_batches");
        batchesCols.forEach(c => console.log(` - ${c.Field} (${c.Type})`));

        console.log("\nTable: sterilization_batch_items");
        itemsCols.forEach(c => console.log(` - ${c.Field} (${c.Type})`));

    } catch (err) {
        console.error("Error reading schema:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

checkSchema();
