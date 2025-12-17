const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. Try to load .env.cloud explicitly BEFORE requiring db.js
const cloudEnvPath = path.resolve(__dirname, '.env.cloud');
if (fs.existsSync(cloudEnvPath)) {
    console.log("☁️  Loading configuration from .env.cloud...");
    const envConfig = dotenv.parse(fs.readFileSync(cloudEnvPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.log("⚠️  .env.cloud not found. Using default/local .env configuration.");
}

const db = require('./db');

async function runFix() {
    console.log(`🚀 Starting Schema Fix on Host: ${process.env.DB_HOST}...`);

    // Read SQL file
    const sqlPath = path.join(__dirname, 'fix_sterilization_columns_cloud.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const connection = await db.getConnection();

    try {
        for (const statement of statements) {
            console.log(`\nRunning: ${statement.substring(0, 50)}...`);
            try {
                await connection.query(statement);
                console.log("✅ Success");
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR') {
                    console.log("⚠️  Skipped: Column might already be correct.");
                } else if (err.code === 'ER_NO_SUCH_TABLE') {
                    console.log("⚠️  Skipped: Table does not exist.");
                } else {
                    console.error("❌ Error:", err.message);
                }
            }
        }
        console.log("\n🎉 Fix Process Completed.");
    } catch (err) {
        console.error("Unexpected Error:", err);
    } finally {
        connection.release();
        process.exit();
    }
}

runFix();
