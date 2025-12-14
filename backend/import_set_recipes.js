import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack',
};

async function importSetRecipes() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        const filePath = path.join(__dirname, '../data_analisa/cssd_november.xlsx');
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const workbook = XLSX.readFile(filePath);

        // First, get list of known sets from STOCK STERIL sheet
        const knownSets = new Set();
        const sheetStock = workbook.Sheets['STOCK STERIL'];
        if (sheetStock) {
            const dataStock = XLSX.utils.sheet_to_json(sheetStock, { header: 1 });
            for (let i = 10; i < dataStock.length; i++) {
                const row = dataStock[i];
                if (!row || !row[2]) continue;
                const name = row[2].toString().trim();
                if (name.toUpperCase().includes('SET')) {
                    knownSets.add(name);
                }
            }
        }
        console.log(`Found ${knownSets.size} known sets from STOCK STERIL`);

        // Now parse TIDAK LENGKAP for recipes
        const sheetRecipes = workbook.Sheets['TIDAK LENGKAP'];
        if (!sheetRecipes) throw new Error("Sheet 'TIDAK LENGKAP' not found");

        const dataRecipes = XLSX.utils.sheet_to_json(sheetRecipes, { header: 1 });
        console.log(`Sheet 'TIDAK LENGKAP' loaded. Rows: ${dataRecipes.length}`);

        let currentSetName = null;
        let currentSetId = null;
        let setsProcessed = 0;
        let itemsAdded = 0;

        for (let i = 10; i < dataRecipes.length; i++) {
            const row = dataRecipes[i];
            if (!row || !row[2]) continue;

            const colA = row[0];
            const colC = row[2];
            const colD = row[3];

            const name = colC.toString().trim();
            const qty = parseInt(colD) || 1;

            // Check if this is a SET name (either has code in colA OR is in knownSets list)
            const isSetHeader = (colA != null && colA.toString().trim().length > 0) || knownSets.has(name);

            if (isSetHeader && name.toUpperCase().includes('SET')) {
                // This is a new set
                currentSetName = name;

                // Get or create set definition
                const [existingSets] = await connection.execute('SELECT id FROM instrument_sets WHERE name = ?', [name]);
                if (existingSets.length > 0) {
                    currentSetId = existingSets[0].id;
                } else {
                    currentSetId = uuidv4();
                    await connection.execute('INSERT INTO instrument_sets (id, name) VALUES (?, ?)', [currentSetId, name]);
                    console.log(`  + Created Set: ${name}`);
                    setsProcessed++;
                }
            } else if (currentSetId && currentSetName) {
                // This is an item inside the current set
                // Get or create the instrument
                const [existingInst] = await connection.execute('SELECT id FROM instruments WHERE name = ?', [name]);
                let itemId;
                if (existingInst.length > 0) {
                    itemId = existingInst[0].id;
                } else {
                    itemId = uuidv4();
                    await connection.execute(
                        'INSERT INTO instruments (id, name, category, totalStock, cssdStock) VALUES (?, ?, ?, ?, ?)',
                        [itemId, name, 'Single', 300, 300]
                    );
                }

                // Link to set
                const [links] = await connection.execute(
                    'SELECT * FROM instrument_set_items WHERE setId = ? AND instrumentId = ?',
                    [currentSetId, itemId]
                );

                if (links.length === 0) {
                    await connection.execute(
                        'INSERT INTO instrument_set_items (setId, instrumentId, quantity) VALUES (?, ?, ?)',
                        [currentSetId, itemId, qty]
                    );
                    itemsAdded++;
                }
            }
        }

        console.log(`\nImport Complete!`);
        console.log(`Sets processed: ${setsProcessed}`);
        console.log(`Items added: ${itemsAdded}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

importSetRecipes();
