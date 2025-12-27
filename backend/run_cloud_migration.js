const fs = require('fs');
const path = require('path');
const pg = require('pg');
const dotenv = require('dotenv');

// Load .env.production
const envPath = path.resolve(__dirname, '..', '.env.production');
if (fs.existsSync(envPath)) {
    console.log(`Loading env from ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.error("❌ .env.production not found!");
    process.exit(1);
}

async function runCloudMigration() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Please provide a SQL file path.");
        process.exit(1);
    }

    const fullPath = path.resolve(__dirname, '..', filePath);
    console.log(`Running Migration on CLOUD: ${fullPath}`);

    // Config
    const config = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    };

    console.log(`Connecting to ${config.host} as ${config.user}...`);

    if (!config.host || !config.user || !config.password) {
        console.error("❌ Missing DB_HOST, DB_USER, or DB_PASSWORD in .env.production");
        process.exit(1);
    }

    const client = new pg.Pool(config);

    try {
        await client.connect();
        console.log("Connected to Cloud DB.");
        const sql = fs.readFileSync(fullPath, 'utf8');
        console.log("Executing SQL...");
        await client.query(sql);
        console.log("✅ Cloud Migration applied successfully!");
    } catch (err) {
        console.error("❌ Cloud Migration Failed:", err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

runCloudMigration();
