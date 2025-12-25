const db = require('./db');

async function checkDressingSet() {
    try {
        console.log("=== CHECKING PACKS / SETS ===");

        // Cek tabel 'sterile_packs' atau 'instrument_sets' (karena 'sets' tidak ada)
        // Kita lihat tabel apa saja yang relevan
        // Dari code controller transactions, ada 'transaction_set_items' dan 'sterile_packs'

        // 1. Cek sterile_packs
        const [packs] = await db.query("SELECT * FROM sterile_packs WHERE name LIKE '%Dressing%' OR name LIKE '%Set%' LIMIT 5");

        if (packs.length === 0) {
            console.log("No packs found matching 'Dressing' or 'Set'. Showing all packs:");
            const [allPacks] = await db.query("SELECT * FROM sterile_packs LIMIT 5");
            console.table(allPacks);
            if (allPacks.length === 0) {
                console.log("Tabel sterile_packs kosong.");
            }
        } else {
            console.log("Ditemukan Paket/Set:");
            console.table(packs);
        }

        // 2. Cek instrument_sets ?
        // Controller transaksi pakai 'transaction_set_items' -> 'setId'. Tapi nama tabel masternya apa? 'sets'?
        // Error sebelumnya bilang "Table 'steritrack.sets' doesn't exist". 
        // Mari kita cek struktur 'transaction_set_items' foreign key-nya ke mana.
        // Atau kita bisa menebak nama tabelnya mungkin 'instrument_sets'?

        try {
            const [sets] = await db.query("SELECT * FROM instrument_sets LIMIT 5");
            console.log("\nDitemukan di instrument_sets:");
            console.table(sets);
        } catch (e) { console.log("\nTabel instrument_sets tidak ada."); }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkDressingSet();
