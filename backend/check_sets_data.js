import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack',
};

async function checkSets() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Count sets
        const [setCount] = await connection.execute('SELECT COUNT(*) as total FROM instrument_sets');
        console.log(`\nTotal Sets: ${setCount[0].total}`);

        // Show first 5 sets with their items
        const [sets] = await connection.execute('SELECT * FROM instrument_sets LIMIT 5');

        for (const set of sets) {
            console.log(`\n=== ${set.name} ===`);
            const [items] = await connection.execute(`
                SELECT i.name, isi.quantity 
                FROM instrument_set_items isi
                JOIN instruments i ON i.id = isi.instrumentId
                WHERE isi.setId = ?
            `, [set.id]);

            if (items.length === 0) {
                console.log('  (No items defined)');
            } else {
                items.forEach(item => {
                    console.log(`  - ${item.quantity}x ${item.name}`);
                });
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkSets();
