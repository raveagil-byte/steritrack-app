const db = require('./db');

async function analyzeWorkflow() {
    try {
        const connection = await db.getConnection();

        // 1. Get totals from instruments table
        const [instStats] = await connection.query(`
            SELECT 
                SUM(dirtyStock) as totalDirty,
                SUM(packingStock) as totalPacking,
                SUM(cssdStock) as totalSterile,
                SUM(brokenStock) as totalBroken
            FROM instruments
        `);

        // 2. Get totals from instrument_unit_stock (items currently at units)
        const [unitStats] = await connection.query(`
            SELECT SUM(quantity) as totalDistributed
            FROM instrument_unit_stock
        `);

        const stats = {
            dirty: parseInt(instStats[0].totalDirty || 0),
            packing: parseInt(instStats[0].totalPacking || 0),
            sterile: parseInt(instStats[0].totalSterile || 0),
            distributed: parseInt(unitStats[0].totalDistributed || 0),
            broken: parseInt(instStats[0].totalBroken || 0)
        };

        const totalCirculating = stats.dirty + stats.packing + stats.sterile + stats.distributed;

        const fs = require('fs');
        let output = "=== Analisis Status Instrumen ===\n";
        output += `Total Instrumen (Sirkulasi): ${totalCirculating}\n`;
        output += "---------------------------------\n";

        const pDirty = totalCirculating > 0 ? ((stats.dirty / totalCirculating) * 100).toFixed(1) : 0;
        const pPacking = totalCirculating > 0 ? ((stats.packing / totalCirculating) * 100).toFixed(1) : 0;
        const pSterile = totalCirculating > 0 ? ((stats.sterile / totalCirculating) * 100).toFixed(1) : 0;
        const pDist = totalCirculating > 0 ? ((stats.distributed / totalCirculating) * 100).toFixed(1) : 0;

        output += `1. Kotor (Belum Dicuci): \t${stats.dirty} item\t(${pDirty}%)\n`;
        output += `2. Packing (Sudah Cuci): \t${stats.packing} item\t(${pPacking}%)\n`;
        output += `3. Steril (Siap Kirim): \t${stats.sterile} item\t(${pSterile}%)\n`;
        output += `4. Terdistribusi (Di Unit): \t${stats.distributed} item\t(${pDist}%)\n`;
        output += "---------------------------------\n";

        const unsterilized = stats.dirty + stats.packing;
        const pUnsterilized = totalCirculating > 0 ? ((unsterilized / totalCirculating) * 100).toFixed(1) : 0;

        output += `\nKESIMPULAN:\n`;
        output += `Total Belum Steril (Kotor + Packing): ${unsterilized} item (${pUnsterilized}%)\n`;

        if (unsterilized > (totalCirculating / 2)) {
            output += "=> BENAR. Sebagian besar instrumen masih dalam proses (belum steril).\n";
        } else {
            output += "=> SALAH. Sebagian besar instrumen sudah steril atau terdistribusi.\n";
        }

        fs.writeFileSync('analysis_results.txt', output);
        console.log("Analysis written to analysis_results.txt");

        connection.release();
        process.exit(0);

    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

analyzeWorkflow();
