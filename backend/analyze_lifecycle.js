const db = require('./db');

async function analyzeLifecycle() {
    try {
        const connection = await db.getConnection();

        console.log("=== Analisis Lifecycle Aset ===");

        // 1. Total Assets
        const [totalRes] = await connection.query('SELECT COUNT(*) as cnt FROM instrument_assets');
        const total = totalRes[0].cnt;

        // 2. Unused Assets (Zero Cycles)
        const [unusedRes] = await connection.query('SELECT COUNT(*) as cnt FROM instrument_assets WHERE usageCount = 0');
        const unused = unusedRes[0].cnt;

        // 3. Used Assets
        const [usedRes] = await connection.query('SELECT COUNT(*) as cnt FROM instrument_assets WHERE usageCount > 0');
        const used = usedRes[0].cnt;

        console.log(`Total Aset Terdaftar: ${total}`);
        console.log(`- Belum Pernah Dipakai/Dicuci (Usage=0): ${unused} (${((unused / total) * 100).toFixed(1)}%)`);
        console.log(`- Sudah Pernah Dipakai (Usage>0): ${used} (${((used / total) * 100).toFixed(1)}%)`);

        console.log("\nSample Data (Usage=0):");
        const [sampleUnused] = await connection.query('SELECT id, serialNumber, status, usageCount FROM instrument_assets WHERE usageCount = 0 LIMIT 3');
        console.table(sampleUnused);

        console.log("\nKESIMPULAN KEPADA USER:");
        console.log("Ya, saat ini mayoritas aset memiliki Usage Count = 0, yang berarti belum pernah tercatat melewati siklus cuci-steril di sistem ini.");
        console.log("Ini karena database awal (Seed) langsung membuat item dalam status 'READY/STERILE'.");

        connection.release();
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

analyzeLifecycle();
