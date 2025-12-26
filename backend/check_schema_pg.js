
const db = require('./db');

async function checkSchema() {
    console.log("Checking Postgres Schema for INSTRUMENTS & TRANSACTIONS...");
    const tables = ['instruments', 'transactions'];

    const client = await db.getConnection();

    try {
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [table]);

            res[0].forEach(col => {
                console.log(`  - ${col.column_name} (${col.data_type})`);
            });
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        client.release();
        process.exit();
    }
}

checkSchema();
