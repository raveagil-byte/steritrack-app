const db = require('./db');

async function checkStocks() {
    try {
        console.log("=== CHECKING INSTRUMENT STOCKS ===");

        // Cek total instrumen satuan (Category = 'SINGLE')
        const [singles] = await db.query(`
            SELECT id, name, totalStock, cssdStock, dirtyStock, packingStock, brokenStock 
            FROM instruments 
            WHERE category = 'SINGLE' OR category IS NULL 
            LIMIT 10
        `);

        if (singles.length === 0) {
            console.log("No Single Instruments found.");
        } else {
            console.log("\nSample Single Instruments Stock:");
            console.table(singles.map(i => ({
                Name: i.name,
                Ready: i.cssdStock,
                Dirty: i.dirtyStock,
                Packing: i.packingStock
            })));
        }

        // Cek apakah ada sets
        const [sets] = await db.query(`
            SELECT id, name, totalStock, cssdStock, dirtyStock, packingStock
            FROM instruments 
            WHERE category = 'SET' 
            LIMIT 5
        `);
        if (sets.length > 0) {
            console.log("\nSample Sets Stock:");
            console.table(sets.map(i => ({
                Name: i.name,
                Ready: i.cssdStock,
                Dirty: i.dirtyStock,
                Packing: i.packingStock
            })));
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkStocks();
