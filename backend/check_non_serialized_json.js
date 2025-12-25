const db = require('./db');

async function checkNonSerialized() {
    try {
        console.log("START");
        const [stats] = await db.query(`
            SELECT 
                SUM(CASE WHEN is_serialized = 1 THEN 1 ELSE 0 END) as SerializedCount,
                SUM(CASE WHEN is_serialized = 0 OR is_serialized IS NULL THEN 1 ELSE 0 END) as NonSerializedCount
            FROM instruments
        `);
        console.log(JSON.stringify(stats[0]));
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
checkNonSerialized();
