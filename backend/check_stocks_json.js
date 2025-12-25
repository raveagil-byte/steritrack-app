const db = require('./db');
async function checkStocks() {
    try {
        const [rows] = await db.query('SELECT name, dirtyStock, packingStock FROM instruments LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));
        process.exit();
    } catch (e) { console.error(e); process.exit(); }
}
checkStocks();
