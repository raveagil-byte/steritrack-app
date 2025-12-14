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

async function removeDuplicates() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        // Find duplicates by name (ignoring category for now)
        const [duplicates] = await connection.execute(`
            SELECT name, COUNT(*) as count
            FROM instruments
            GROUP BY name
            HAVING COUNT(*) > 1
        `);

        console.log(`\nFound ${duplicates.length} duplicate names:`);
        duplicates.forEach(d => {
            console.log(`  - ${d.name}: ${d.count} entries`);
        });

        if (duplicates.length === 0) {
            console.log('\nNo duplicates found. Database is clean!');
            return;
        }

        console.log('\nCleaning duplicates...');

        for (const dup of duplicates) {
            // Get all records with this name
            const [records] = await connection.execute(
                'SELECT * FROM instruments WHERE name = ? ORDER BY id',
                [dup.name]
            );

            if (records.length <= 1) continue;

            // Keep the first one (or the one with highest stock)
            // Sort by totalStock descending to keep the one with most stock
            records.sort((a, b) => b.totalStock - a.totalStock);
            const keepRecord = records[0];
            const deleteRecords = records.slice(1);

            console.log(`\n  Processing: ${dup.name}`);
            console.log(`    Keeping ID: ${keepRecord.id} (Category: ${keepRecord.category}, Stock: ${keepRecord.totalStock})`);

            // Delete the duplicates
            for (const delRec of deleteRecords) {
                console.log(`    Deleting ID: ${delRec.id} (Category: ${delRec.category}, Stock: ${delRec.totalStock})`);

                // First, update any references in instrument_set_items
                await connection.execute(
                    'UPDATE instrument_set_items SET instrumentId = ? WHERE instrumentId = ?',
                    [keepRecord.id, delRec.id]
                );

                // Then delete the duplicate
                await connection.execute('DELETE FROM instruments WHERE id = ?', [delRec.id]);
            }
        }

        console.log('\nDuplicate cleanup complete!');

        // Show final count
        const [finalCount] = await connection.execute('SELECT COUNT(*) as total FROM instruments');
        console.log(`Total instruments remaining: ${finalCount[0].total}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

removeDuplicates();
