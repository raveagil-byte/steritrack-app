
const mysqlPool = require('./db_mysql');

async function checkMysql() {
    console.log("=== CHECKING MYSQL SOURCE DATABASE ===");
    try {
        const [tables] = await mysqlPool.query("SHOW TABLES");
        console.log("MySQL Tables found:", tables.length);
        tables.forEach(t => console.log(" - " + Object.values(t)[0]));

        // Check row counts for key tables
        const tablesToCheck = ['users', 'instruments', 'units', 'transactions'];
        for (let t of tablesToCheck) {
            try {
                const [rows] = await mysqlPool.query(`SELECT COUNT(*) as count FROM ${t}`);
                console.log(`Table '${t}': ${rows[0].count} rows`);
            } catch (e) {
                console.log(`Table '${t}': Not found or empty`);
            }
        }
    } catch (err) {
        console.error("❌ MySQL Connection Failed:", err.message);
        console.log("Make sure MySQL is running and DB_HOST/USER/PASS in .env are correct for MySQL.");
    } finally {
        process.exit();
    }
}

checkMysql();
