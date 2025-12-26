const { Client } = require('pg');

async function checkLocal() {
    console.log("🔍 Checking LOCAL PostgreSQL (localhost:5432)...");
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: '', // Try empty or default
        database: 'steritrack'
    });

    try {
        await client.connect();
        const res = await client.query("SELECT count(*) as count FROM users");
        console.log(`✅ Local PostgreSQL is READY. Found ${res.rows[0].count} users.`);
    } catch (err) {
        console.log("❌ Local PostgreSQL Check Failed:", err.message);
        if (err.message.includes('password')) {
            console.log("   (Hint: Password might be needed for user 'postgres')");
        }
        if (err.message.includes('does not exist')) {
            console.log("   (Hint: Database 'steritrack' might be missing locally)");
        }
    } finally {
        await client.end();
    }
}

checkLocal();
