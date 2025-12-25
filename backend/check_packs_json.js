const db = require('./db');

async function checkPacksJson() {
    try {
        const [packs] = await db.query("SELECT id, name FROM sterile_packs LIMIT 10");
        console.log("PACKS:");
        console.log(JSON.stringify(packs));
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
checkPacksJson();
