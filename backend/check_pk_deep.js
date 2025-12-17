const db = require('./db');

// List of tables known to be safe (have PK)
// We will explicitly check everything else.

async function checkDetailed() {
    console.log("🔍 Deep Check: Tables without Primary Key...");
    const connection = await db.getConnection();
    try {
        const [tables] = await connection.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);

        let badTables = [];

        for (const table of tableNames) {
            // Check if it is a VIEW
            const [status] = await connection.query(`SHOW FULL TABLES LIKE '${table}'`);
            const isView = status[0].Table_type === 'VIEW';

            if (isView) {
                console.log(`👁️  '${table}' is a VIEW (Will be skipped in dump)`);
                continue;
            }

            const [keys] = await connection.query(`SHOW KEYS FROM ${table} WHERE Key_name = 'PRIMARY'`);
            if (keys.length === 0) {
                console.log(`❌ Table '${table}' has NO Primary Key.`);
                badTables.push(table);
            }
        }

        console.log("\n⚠️  Problematic Tables:", badTables);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

checkDetailed();
