import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from ROOT directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack',
};

function toTitleCase(str) {
    if (!str) return str;
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

async function fixCasing() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        console.log('Fetching all instruments...');
        const [instruments] = await connection.execute('SELECT id, name FROM instruments');

        console.log(`Found ${instruments.length} instruments. Updating casing...`);
        for (const inst of instruments) {
            const newName = toTitleCase(inst.name);
            if (newName !== inst.name) {
                await connection.execute('UPDATE instruments SET name = ? WHERE id = ?', [newName, inst.id]);
                // console.log(`  Updated: "${inst.name}" -> "${newName}"`);
            }
        }

        console.log('Fetching all instrument sets...');
        const [sets] = await connection.execute('SELECT id, name FROM instrument_sets');

        console.log(`Found ${sets.length} sets. Updating casing...`);
        for (const s of sets) {
            const newName = toTitleCase(s.name);
            if (newName !== s.name) {
                await connection.execute('UPDATE instrument_sets SET name = ? WHERE id = ?', [newName, s.id]);
                // console.log(`  Updated Set: "${s.name}" -> "${newName}"`);
            }
        }

        console.log('Data casing update complete!');

    } catch (error) {
        console.error('Error updating casing:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixCasing();
