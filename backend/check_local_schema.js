const db = require('./db');

async function checkSchema() {
    console.log("🔍 Checking LOCAL Database Schema (PostgreSQL)...");
    const connection = await db.getConnection();
    try {
        const [batchesCols] = await connection.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sterilization_batches'");

        console.log("\nTable: sterilization_batches");
        if (batchesCols.length === 0) {
            console.log(" - Table not found or empty columns");
        } else {
            // Debug the object structure
            // console.log("DEBUG ROW:", JSON.stringify(batchesCols[0])); 

            // Try explicit access
            batchesCols.forEach(c => {
                const name = c.column_name || c.columnname || c.ColumnName || "UNKNOWN";
                const type = c.data_type || c.datatype || c.DataType || "UNKNOWN";
                console.log(` - ${name} (${type})`);
            });
        }

    } catch (err) {
        console.error("Error reading schema:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

checkSchema();
