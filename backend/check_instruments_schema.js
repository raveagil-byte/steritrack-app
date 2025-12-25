const db = require('./db');
const fs = require('fs');

async function checkSchema() {
    try {
        const [rows] = await db.query('DESCRIBE instruments');
        console.log("SCHEMA instruments JSON:");
        fs.writeFileSync('backend/schema_instruments_dump.json', JSON.stringify(rows, null, 2));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();
