const db = require('./db');
const fs = require('fs');

async function checkSchema() {
    try {
        const [rows] = await db.query('DESCRIBE instrument_history');
        console.log("SCHEMA instrument_history JSON:");
        fs.writeFileSync('backend/schema_history_dump.json', JSON.stringify(rows, null, 2));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();
