const db = require('./db');

async function checkAllStocks() {
    try {
        console.log("=== CEK STOK SEMUA UNIT ===\n");
        const [stocks] = await db.query(`
            SELECT u.name as UnitName, i.name as Instrument, s.quantity 
            FROM instrument_unit_stock s
            JOIN units u ON s.unitId = u.id
            JOIN instruments i ON s.instrumentId = i.instrumentId
        `);

        // Query raw jika join gagal karena nama kolom
        const [rawStocks] = await db.query('SELECT * FROM instrument_unit_stock');

        if (rawStocks.length === 0) {
            console.log("Tabel instrument_unit_stock BENAR-BENAR KOSONG.");
        } else {
            console.log(`Ada ${rawStocks.length} data stok.`);
            console.table(rawStocks);
        }
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
checkAllStocks();
