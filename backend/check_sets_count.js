const db = require('./db');
async function checkSets() {
    try {
        const [sets] = await db.query('SELECT id, name FROM instrument_sets');
        console.log("SETS COUNT:", sets.length);
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
checkSets();
