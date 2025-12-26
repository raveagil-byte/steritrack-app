
const mysql = require('mysql2/promise');
const db = require('./db'); // Postgres

async function validasiMigrasi() {
    console.log("=== CHECKING CONNECTIVITY FOR MIGRATION ===");

    // 1. Try Connect to MySQL (Assuming Laragon Standard Defaults)
    // We override ENV variables because they likely point to Postgres
    const mysqlConfig = {
        host: 'localhost',
        user: 'root',
        password: '', // Default Laragon
        database: 'steritrack', // Assuming it's the same name? Or 'steritrack_old'?
        port: 3306
    };

    console.log("Attemping MySQL connection with:", { ...mysqlConfig, password: '***' });

    let mysqlConn;
    try {
        mysqlConn = await mysql.createConnection(mysqlConfig);
        console.log("✅ MySQL Connection SUCCESS. Found DB 'steritrack'.");

        const [tables] = await mysqlConn.query("SHOW TABLES");
        console.log(`   Found ${tables.length} tables in MySQL.`);

        // Check for 'users'
        const [users] = await mysqlConn.query("SELECT COUNT(*) as c FROM users");
        console.log(`   MySQL 'users' count: ${users[0].c}`);

    } catch (err) {
        console.error("❌ MySQL Connection FAILED:", err.message);
        console.log("   (Maybe the database name is different? or password is not empty?)");
        process.exit(1);
    }

    // 2. Check Postgres Connection
    try {
        const pgRes = await db.query("SELECT COUNT(*) as c FROM users");
        console.log(`✅ Postgres Connection SUCCESS. Current 'users' count: ${pgRes[0].c}`);
    } catch (err) {
        console.error("❌ Postgres Connection FAILED:", err.message);
        process.exit(1);
    }

    console.log("\nREADY TO MIGRATE? (This checks passed)");
    await mysqlConn.end();
    process.exit(0);
}

validasiMigrasi();
