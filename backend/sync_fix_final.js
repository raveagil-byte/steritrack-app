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

    // Step 1: Dump Local Data cleanly using --result-file to avoid PowerShell encoding issues
    console.log("1️⃣  Exporting Local Database...");

    // --hex-blob: Ensures binary data is safe
    // --skip-comments: Reduces noise
    // --insert-ignore: Prevents stopping on duplicate keys
    // --result-file: Writes directly to file, preserving encoding correctly
    const cmd = `mysqldump -u root --result-file="${DUMP_FILE}" --hex-blob --insert-ignore --skip-comments steritrack`;

    await new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Exec error: ${error}`);
                return reject(error);
            }
            resolve();
        });
    });

    // Check if file exists and has content
    const stats = fs.statSync(DUMP_FILE);
    console.log(`✅ Export Complete. File size: ${(stats.size / 1024).toFixed(2)} KB`);

    if (stats.size < 100) {
        console.error("❌ Warning: Dump file seems too small. Check if your local database 'steritrack' has data.");
    }

    // Step 2: Import to Cloud
    console.log("2️⃣  Connecting to Cloud Database...");
    const connection = await mysql.createConnection(cloudConfig);

    try {
        console.log("   Reading dump file...");
        const sql = fs.readFileSync(DUMP_FILE, 'utf8');

        console.log("   Importing data to Cloud (This may take a moment)...");

        // Disable checks for smoother import
        await connection.query('SET FOREIGN_KEY_CHECKS=0;');

        await connection.query(sql);

        console.log("✅ Data Sync Successful! Cloud Database is now up to date.");

    } catch (err) {
        console.error("❌ Import Phase Failed:", err.message);
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS=1;');
        await connection.end();

        // Cleanup
        try { fs.unlinkSync(DUMP_FILE); } catch (e) { }
        process.exit();
    }
}

syncData();
