
const db = require('./db');

async function checkFeatures() {
    console.log("=== CHECKING FOR ANTI-HOARDING FEATURES IN CODEBASES ===");

    // 1. Check for Par Level / Max Stock columns
    try {
        console.log("\n[1] Check Par Level / Max Stock:");
        const res1 = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('instruments', 'inventory_snapshots', 'units') 
            AND column_name LIKE '%max%' OR column_name LIKE '%par%' OR column_name LIKE '%quota%'
        `);
        if (res1[0].length > 0) {
            console.log("   FOUND columns:", res1[0]);
        } else {
            console.log("   NOT FOUND: No 'max_stock' or 'par_level' columns detected.");
        }
    } catch (e) { console.log(e.message); }

    // 2. Check for Stock Audit / Opname logic
    try {
        console.log("\n[2] Check Stock Audit / Opname Logic:");
        // Looking for explicit "audit" or "stock_check" tables or routes
        // We know 'audit_logs' exists, but that's for activity history usually.
        // Let's check for specific "Audit Stock" transaction types or tables.
        const res2 = await db.query(`SELECT * FROM transaction_types WHERE code LIKE '%AUDIT%' OR code LIKE '%OPNAME%'`);
        if (res2[0].length > 0) {
            console.log("   FOUND Transaction Type:", res2[0]);
        } else {
            console.log("   NOT FOUND: No 'AUDIT' transaction type.");
        }
    } catch (e) { console.log(e.message); }

    process.exit();
}

checkFeatures();
