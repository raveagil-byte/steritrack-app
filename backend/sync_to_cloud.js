const mysqldump = require('mysqldump');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. Get Local Config
const localEnv = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

// 2. Get Cloud Config from user input (Hardcoded here for safety/simplicity as separate file was deleted)
// PLEASE FILL THIS IN BEFORE RUNNING
const cloudConfig = {
    host: 'mysql-steritrack-steritrack.l.aivencloud.com',
    user: 'avnadmin',
    password: process.env.CLOUD_DB_PASSWORD || '', // You might need to set this env var or edit this file temporarily
    database: 'defaultdb',
    port: 25482,
    ssl: { rejectUnauthorized: false }
};

async function migrateData() {
    console.log("📦 Starting Data Migration (Local -> Cloud)...");

    const dumpFile = path.join(__dirname, 'temp_dump.sql');

    // Step 1: Dump Local Data (Data Only, No Create Table to avoid conflicts if possible, or full dump)
    // We will do full dump but use INSERT IGNORE logic if possible, or just replace.
    // Simplest approach: Dump local to file, then import to cloud.

    console.log("1️⃣  Exporting Local Database...");

    // We can use the 'mysqldump' npm package or just read the file we created via shell command
    const dumpSql = fs.readFileSync(path.join(__dirname, 'local_dump.sql'), 'utf8');

    // Parsing Dump File is hard. 
    // Better strategy: Read table by table and insert? No, too slow.
    // Best strategy: Execute the SQL dump on cloud connection. 
    // BUT we need to be careful about 'CREATE DATABASE' lines etc.

    const connection = await mysql.createConnection({
        ...cloudConfig,
        multipleStatements: true
    });

    console.log("2️⃣  Connected to Cloud DB. Importing data...");

    // We need to disable Foreign Key Checks temporarily
    await connection.query('SET FOREIGN_KEY_CHECKS=0;');

    try {
        // Run the dump file
        // Note: running a huge dump file via driver might hit packet size limits.
        // But for this size it should be fine.
        await connection.query(dumpSql);
        console.log("✅ Data Imported successfully!");
    } catch (err) {
        console.error("❌ Import Failed:", err.message);
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS=1;');
        connection.end();
    }
}

// Check if we have password
if (!cloudConfig.password) {
    console.error("❌ ERROR: Cloud Password missing in script. Please edit sync_data.js and add the password.");
} else {
    migrateData();
}
