const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Try loading from multiple locations
const backendEnv = path.join(__dirname, '.env');
const rootEnv = path.join(__dirname, '../.env.local');

if (fs.existsSync(backendEnv)) {
    require('dotenv').config({ path: backendEnv });
} else if (fs.existsSync(rootEnv)) {
    require('dotenv').config({ path: rootEnv });
} else {
    require('dotenv').config();
}

console.log('DB URL:', process.env.DATABASE_URL ? 'Loaded' : 'Not Loaded');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('aiven') ? { rejectUnauthorized: false } : false
});

const units = [
    { name: 'IGD (Instalasi Gawat Darurat)', type: 'Emergency' },
    { name: 'OK (Kamar Operasi)', type: 'Surgery' },
    { name: 'ICU (Intensive Care Unit)', type: 'Intensive' },
    { name: 'Rawat Inap - Mawar', type: 'Ward' },
    { name: 'Rawat Inap - Melati', type: 'Ward' },
    { name: 'Poli Gigi', type: 'Outpatient' },
    { name: 'Poli Bedah', type: 'Outpatient' },
    { name: 'VK (Kamar Bersalin)', type: 'Maternity' }
];

async function seedUnits() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding Units...');

        for (const unit of units) {
            // Check if unit exists
            const res = await client.query('SELECT id FROM units WHERE name = $1', [unit.name]);

            if (res.rows.length === 0) {
                await client.query('INSERT INTO units (name) VALUES ($1)', [unit.name]);
                console.log(`✅ Added: ${unit.name}`);
            } else {
                console.log(`ℹ️ Exists: ${unit.name}`);
            }
        }

        console.log('✨ Unit Seeding Completed!');
    } catch (err) {
        console.error('❌ Error Seeding Units:', err);
    } finally {
        client.release();
        pool.end();
    }
}

seedUnits();
