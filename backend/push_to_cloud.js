const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importToCloud() {
    console.log("☁️  Connecting to Cloud Database...");

    const connection = await mysql.createConnection({
        host: 'mysql-steritrack-steritrack.l.aivencloud.com',
        user: process.env.DB_USER || 'avnadmin',
        password: process.env.DB_PASSWORD, // Env Variable
        database: 'defaultdb',
        port: 27452,
        multipleStatements: true,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("📂 Reading local dump file...");
        const sql = fs.readFileSync(path.join(__dirname, 'data_lokal_utf8.sql'), 'utf8');

        console.log("🚀 Importing data to Cloud...");

        // Disable foreign keys to prevent errors due to table order
        await connection.query('SET FOREIGN_KEY_CHECKS=0;');

        // Execute the dump
        await connection.query(sql);

        console.log("✅ Data successfully imported to Cloud!");

    } catch (err) {
        console.error("❌ Import Failed:", err.message);
    } finally {
        // Re-enable foreign keys
        await connection.query('SET FOREIGN_KEY_CHECKS=1;');
        connection.end();
        process.exit();
    }
}

importToCloud();
