const mysql = require('mysql2');
const dotenv = require('dotenv');

const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Create database if not exists (hacky way to init if it doesn't exist)
// Actually we should connect without database first to create it, but for now assuming user can create it or use /init-db if they modify connection string
// Or we can try to create it here.
const initPool = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
});

initPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
    if (err) console.error("Error creating DB:", err);
    else console.log("Database ensured.");
    initPool.end();
});


module.exports = pool.promise();
