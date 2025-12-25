const db = require('./db');

async function checkTracking() {
    try {
        console.log("Check Start");
        // 1. IS_SERIALIZED
        const [serializedInsts] = await db.query('SELECT COUNT(*) as count FROM instruments WHERE is_serialized = 1');
        console.log("Serialized Count:", serializedInsts[0].count);

        // 2. SETS QR
        const [sets] = await db.query('SHOW TABLES LIKE "sets"');
        if (sets.length > 0) {
            const [cols] = await db.query('DESCRIBE sets');
            const qrCol = cols.find(c => c.Field.includes('qr') || c.Field.includes('code'));
            console.log("Sets QR Col:", qrCol ? qrCol.Field : "NONE");
        }

        // 3. STERILE_PACKS QR
        const [packs] = await db.query('SHOW TABLES LIKE "sterile_packs"');
        if (packs.length > 0) {
            const [cols] = await db.query('DESCRIBE sterile_packs');
            const qrCol = cols.find(c => c.Field.includes('qr') || c.Field.includes('code'));
            console.log("Packs QR Col:", qrCol ? qrCol.Field : "NONE");
        }
        process.exit();
    } catch (e) { console.log(e); process.exit(); }
}
checkTracking();
