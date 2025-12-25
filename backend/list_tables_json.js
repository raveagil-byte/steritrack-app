const db = require('./db');

async function listTables() {
    try {
        const [rows] = await db.query("SHOW TABLES");
        console.log("JSON TABLES:");
        console.log(JSON.stringify(rows));
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
listTables();
