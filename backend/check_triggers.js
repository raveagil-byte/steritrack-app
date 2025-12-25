const db = require('./db');
const fs = require('fs');

async function checkTriggers() {
    try {
        const [rows] = await db.query('SHOW TRIGGERS');
        console.log("TRIGGERS FOUND:", rows.length);
        fs.writeFileSync('backend/triggers_dump.json', JSON.stringify(rows, null, 2));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit();
    }
}
checkTriggers();
