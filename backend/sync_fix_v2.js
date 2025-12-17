const { exec } = require('child_process');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DUMP_FILE = path.join(__dirname, 'clean_dump.sql');

// Cloud Config
const cloudConfig = {
    host: 'mysql-steritrack-steritrack.l.aivencloud.com',
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD, // Loaded from .env.cloud
    database: 'defaultdb',
    port: 27452,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
};

async function syncData() {
    console.log("🔄 Starting Sync Process (Local -> Cloud)...");

    console.log("1️⃣  Exporting Local Database...");

    // --skip-triggers: Avoids syntax issues with definiters in some environments
    const cmd = `mysqldump -u root --result-file="${DUMP_FILE}" --hex-blob --insert-ignore --skip-comments --skip-triggers steritrack`;

    await new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Exec error: ${error}`);
                return reject(error);
            }
            resolve();
        });
    });

    const stats = fs.statSync(DUMP_FILE);
    console.log(`✅ Export Complete. File size: ${(stats.size / 1024).toFixed(2)} KB`);

    console.log("2️⃣  Connecting to Cloud Database...");
    const connection = await mysql.createConnection(cloudConfig);

    try {
        console.log("   Reading dump file...");
        const sql = fs.readFileSync(DUMP_FILE, 'utf8');

        console.log("   Importing data to Cloud...");

        await connection.query('SET FOREIGN_KEY_CHECKS=0;');

        // Split file if too large? No, usually fine.
        // But let's try to remove DEFINER statements which often cause permission errors on cloud DBs
        // Regex to remove DEFINER=`root`@`localhost`
        const cleanSql = sql.replace(/DEFINER=`[^`]+`@`[^`]+`/g, "");

        await connection.query(cleanSql);

        console.log("✅ Data Sync Successful! Cloud Database matches Local.");

    } catch (err) {
        console.error("❌ Import Phase Failed:", err.message);
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS=1;');
        await connection.end();
        try { fs.unlinkSync(DUMP_FILE); } catch (e) { }
        process.exit();
    }
}

syncData();
