const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load envs
const envPath = path.resolve(__dirname, '../.env.local');
const rootEnv = path.resolve(__dirname, '../.env');
const localEnv = path.resolve(__dirname, '.env');

if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
} else {
    dotenv.config();
}

async function migrateSchema() {
    console.log('🔄 Migrating Schema to "steritrack"...');

    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'steritrack',
        ssl: (process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : undefined
    });

    try {
        await client.connect();

        // Check if users table exists first
        const checkRes = await client.query("SELECT to_regclass('public.users')");
        if (!checkRes.rows[0].to_regclass) {
            console.log('⚠️ Table "users" not found. Applying schema_pg.sql...');
            const schemaSql = fs.readFileSync(path.join(__dirname, 'schema_pg.sql'), 'utf8');
            await client.query(schemaSql);
            console.log('✅ Schema applied successfully!');
        } else {
            console.log('ℹ️ Table "users" already exists. Skipping full schema applied. Checking seed data...');
            // Force re-seed basic users if admin missing
            const userCheck = await client.query("SELECT * FROM users WHERE username = 'admin'");
            if (userCheck.rows.length === 0) {
                console.log('⚠️ Admin user missing. Re-seeding basic data...');
                await client.query(`
                    INSERT INTO users (id, username, password, name, role, unitid) VALUES
                    ('user1', 'admin', '$2a$10$w09u7.PS0p.a.G..D/o...g/o...', 'Kepala Instalasi', 'ADMIN', NULL),
                    ('user2', 'staff', '$2a$10$w09u7.PS0p.a.G..D/o...g/o...', 'Budi (CSSD)', 'CSSD', 'u-cssd'),
                    ('user3', 'nurse', '$2a$10$w09u7.PS0p.a.G..D/o...g/o...', 'Siti (Perawat)', 'NURSE', 'u2')
                    ON CONFLICT DO NOTHING;
                 `);
                console.log('✅ Users seeded.');
            }
        }

    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        await client.end();
    }
}

migrateSchema();
