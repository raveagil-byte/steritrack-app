const db = require('./db');
const fs = require('fs');

async function checkSchema() {
    try {
        const [rows] = await db.query('DESCRIBE transactions');
        console.log("SCHEMA transactions JSON:");
        console.log(JSON.stringify(rows, null, 2));

        fs.writeFileSync('backend/schema_dump.json', JSON.stringify(rows, null, 2));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkSchema();
