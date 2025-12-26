const db = require('./backend/db');

async function run() {
    console.log("Migrating users table...");
    try {
        await db.pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);");
        await db.pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;");
        console.log("Migration successful: Added phone and photo_url columns.");
    } catch (e) {
        console.error("Migration failed:", e.message);
    }
    process.exit();
}

run();
