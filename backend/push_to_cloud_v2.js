const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importToCloud() {
    console.log("☁️  Connecting to Cloud Database...");

    const connection = await mysql.createConnection({
        host: 'mysql-steritrack-steritrack.l.aivencloud.com',
        user: process.env.DB_USER || 'avnadmin',
        password: process.env.DB_PASSWORD, // Use Env Variable
        database: 'defaultdb',
        port: 27452,
        multipleStatements: true,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("📂 Reading local dump file...");
        // Use default encoding which is effectively UTF-8 in Node
        // But the issue is likely Byte Order Mark (BOM) or similar if executed as string directly
        let sql = fs.readFileSync(path.join(__dirname, 'final_dump.sql'), 'utf8');

        // Remove potential BOM (Byte Order Mark) which confuses MySQL parser
        if (sql.charCodeAt(0) === 0xFEFF) {
            sql = sql.slice(1);
        }

        console.log("🚀 Importing data to Cloud...");
        console.log("First 100 chars:", sql.substring(0, 50));

        // Disable foreign keys to prevent errors due to table order
        await connection.query('SET FOREIGN_KEY_CHECKS=0;');

        // Split by semicolon? No, 'multipleStatements: true' handles it BUT mysqldump can be huge.
        // Mysqldump usually has comments like "--" which are fine.
        // The error "You have an error in your SQL syntax... near '??-'" suggests binary garbage or character set issue at the VERY START.

        await connection.query(sql);

        console.log("✅ Data successfully imported to Cloud!");

    } catch (err) {
        console.error("❌ Import Failed:", err.message);
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS=1;');
        connection.end();
        process.exit();
    }
}

importToCloud();
