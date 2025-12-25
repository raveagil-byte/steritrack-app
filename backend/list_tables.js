const db = require('./db');

async function listTables() {
    try {
        const [rows] = await db.query("SHOW TABLES");
        console.log("TABLES IN DB:");
        rows.forEach(r => console.log(Object.values(r)[0]));
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
listTables();
