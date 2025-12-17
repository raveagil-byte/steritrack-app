const db = require('./db');

async function checkNoPrimaryKey() {
    console.log("🔍 Checking tables without Primary Key...");
    const connection = await db.getConnection();
    try {
        const [tables] = await connection.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);

        for (const table of tableNames) {
            const [keys] = await connection.query(`SHOW KEYS FROM ${table} WHERE Key_name = 'PRIMARY'`);
            if (keys.length === 0) {
                console.log(`❌ Table '${table}' has NO Primary Key.`);
            } else {
                // console.log(`✅ Table '${table}' OK.`);
            }
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

checkNoPrimaryKey();
