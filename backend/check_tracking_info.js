const db = require('./db');

async function checkTracking() {
    try {
        console.log("=== CHECKING TRACKING MECHANISMS ===");

        // 1. Check Instruments (Types)
        // We know they don't have qrCode column, but let's check is_serialized count
        const [serializedInsts] = await db.query('SELECT COUNT(*) as count, GROUP_CONCAT(name) as names FROM instruments WHERE is_serialized = 1');
        console.log(`\nSerialized Instruments (individual QR/Serial tracking): ${serializedInsts[0].count}`);
        if (serializedInsts[0].count > 0) {
            console.log(`Examples: ${serializedInsts[0].names}`);
        } else {
            console.log("Note: No instruments are currently set as 'Serialized'. They are tracked by Quantity only.");
        }

        // 2. Check Instrument Assets (The actual individual items if serialized)
        try {
            const [assets] = await db.query('SELECT COUNT(*) as count FROM instrument_assets');
            console.log(`\nTotal Individual Assets (Items with unique Serial/QR): ${assets[0].count}`);
        } catch (e) {
            console.log("\nTable 'instrument_assets' does not exist or error accessing it.");
        }

        // 3. Check Sets / Sterile Packs (Grouped items)
        try {
            // Check table 'sets' or 'sterile_packs' if they exist
            // Based on previous files, 'sets' likely exists
            const [sets] = await db.query('SHOW TABLES LIKE "sets"');
            if (sets.length > 0) {
                const [setRows] = await db.query('SELECT COUNT(*) as count FROM sets');
                console.log(`\nInstrument Sets (Set Bedah/Partus, etc): ${setRows[0].count}`);

                // Do Sets have QR codes?
                const [cols] = await db.query('DESCRIBE sets');
                const qrCol = cols.find(c => c.Field.toLowerCase().includes('qr') || c.Field.toLowerCase().includes('code'));
                if (qrCol) console.log(`- Sets table HAS column: ${qrCol.Field}`);
                else console.log("- Sets table does NOT have explicit QR column (might use ID as QR)");
            }

            const [packs] = await db.query('SHOW TABLES LIKE "sterile_packs"');
            if (packs.length > 0) {
                const [packRows] = await db.query('SELECT COUNT(*) as count FROM sterile_packs');
                console.log(`\nSterile Packs (Ready to use packs): ${packRows[0].count}`);

                const [cols] = await db.query('DESCRIBE sterile_packs');
                const qrCol = cols.find(c => c.Field.toLowerCase().includes('qr') || c.Field.toLowerCase().includes('code'));
                if (qrCol) console.log(`- Sterile Packs table HAS column: ${qrCol.Field}`);
            }

        } catch (e) {
            console.error("Error checking sets/packs:", e.message);
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkTracking();
