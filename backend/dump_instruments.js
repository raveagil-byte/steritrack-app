const db = require('./db');

async function dumpInstruments() {
    try {
        const [rows] = await db.query("SELECT id, name FROM instruments ORDER BY name");
        console.log("ALL INSTRUMENTS:");
        console.log(JSON.stringify(rows));
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
dumpInstruments();
