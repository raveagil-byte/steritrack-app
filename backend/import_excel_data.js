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

// Load env vars from ROOT directory
const envPath = path.join(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
const envResult = dotenv.config({ path: envPath });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steritrack',
};

async function importData() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        const filePath = path.join(__dirname, '../data_analisa/cssd_november.xlsx');
        console.log(`Reading Excel file: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const workbook = XLSX.readFile(filePath);

        // --- PHASE 1: PARSE 'TIDAK LENGKAP' FOR SET DEFINITIONS ---
        // We will treat these as Set Recipes
        const sheetRecipes = workbook.Sheets['TIDAK LENGKAP'];
        if (!sheetRecipes) throw new Error("Sheet 'TIDAK LENGKAP' not found");

        const dataRecipes = XLSX.utils.sheet_to_json(sheetRecipes, { header: 1 });
        console.log(`Sheet 'TIDAK LENGKAP' loaded. Rows: ${dataRecipes.length}`);

        let currentSetName = null;
        let currentSetId = null;
        const instrumentCache = new Map();

        async function getOrCreateInstrument(name, category, stock = 0) {
            if (!name) return null;
            const normalizedName = name.toString().trim();
            if (instrumentCache.has(normalizedName)) return instrumentCache.get(normalizedName);

            // Check DB
            const [rows] = await connection.execute('SELECT id FROM instruments WHERE name = ?', [normalizedName]);
            if (rows.length > 0) {
                instrumentCache.set(normalizedName, rows[0].id);
                // Optional: Update stock if it's currently 0 and we have a new value?
                // For now, only insert new ones.
                return rows[0].id;
            }

            const newId = uuidv4();
            // RULE: If category is 'Single' (Satuan), default stock = 300
            // If category is 'Sets', stock = 0 initially (to be updated by Phase 2)

            let initialStock = stock;
            if (category === 'Single' && initialStock === 0) {
                initialStock = 300; // USER REQUEST: Default stock for Single Instruments = 300
            }

            await connection.execute(
                'INSERT INTO instruments (id, name, category, cssdStock, totalStock) VALUES (?, ?, ?, ?, ?)',
                [newId, normalizedName, category, initialStock, initialStock]
            );
            console.log(`  + Created Instrument: ${normalizedName} (Stock: ${initialStock})`);
            instrumentCache.set(normalizedName, newId);
            return newId;
        }

        async function getOrCreateSet(name) {
            const normalizedName = name.toString().trim();
            const [rows] = await connection.execute('SELECT id FROM instrument_sets WHERE name = ?', [normalizedName]);

            let setId;
            if (rows.length > 0) {
                setId = rows[0].id;
            } else {
                setId = uuidv4();
                await connection.execute('INSERT INTO instrument_sets (id, name) VALUES (?, ?)', [setId, normalizedName]);
                console.log(`  + Created Set Definition: ${normalizedName}`);
            }

            // Also ensure it exists in 'instruments' table as a stockable item
            // IMPORTANT: For Sets, we DO NOT default to 300. Use 0.
            const instrumentId = await getOrCreateInstrument(normalizedName, 'Sets', 0);
            return { setId, instrumentId };
        }

        console.log("Starting Phase 1: Recipes...");
        for (let i = 10; i < dataRecipes.length; i++) {
            const row = dataRecipes[i];
            if (!row) continue;

            const colA = row[0];
            const colC = row[2];
            const colD = row[3];

            if (!colC) continue;

            const name = colC.toString().trim();
            const qty = parseInt(colD) || 1;
            const isHeader = (colA != null && colA.toString().trim().length > 0);

            if (isHeader) {
                currentSetName = name;
                const setInfo = await getOrCreateSet(currentSetName);
                currentSetId = setInfo.setId;
            } else {
                if (currentSetId && currentSetName) {
                    // This is an item INSIDE a set.
                    // Items inside sets are typically 'Single' instruments.
                    // We will set their default stock to 300 if they are created now.
                    const itemId = await getOrCreateInstrument(name, 'Single');

                    const [links] = await connection.execute(
                        'SELECT * FROM instrument_set_items WHERE setId = ? AND instrumentId = ?',
                        [currentSetId, itemId]
                    );

                    if (links.length === 0) {
                        await connection.execute(
                            'INSERT INTO instrument_set_items (setId, instrumentId, quantity) VALUES (?, ?, ?)',
                            [currentSetId, itemId, qty]
                        );
                    }
                } else {
                    // Orphan item?
                    await getOrCreateInstrument(name, 'Single');
                }
            }
        }

        // --- PHASE 2: PARSE 'STOCK STERIL' FOR REAL STOCK LEVELS ---
        // This will OVERWRITE the default stock for items that are explicitly listed in the Stock Sheet.
        console.log('\nStarting Phase 2: Stock Levels from STOCK STERIL...');
        const sheetStock = workbook.Sheets['STOCK STERIL'];
        if (sheetStock) {
            const dataStock = XLSX.utils.sheet_to_json(sheetStock, { header: 1 });
            for (let i = 10; i < dataStock.length; i++) {
                const row = dataStock[i];
                if (!row || !row[2]) continue;

                const name = row[2].toString().trim();
                const stock = parseInt(row[3]); // Col D is JML STOCK

                if (name && !isNaN(stock)) {
                    let id = instrumentCache.get(name);
                    if (!id) {
                        const [rows] = await connection.execute('SELECT id FROM instruments WHERE name = ?', [name]);
                        if (rows.length > 0) id = rows[0].id;
                    }

                    if (id) {
                        // Found existing item -> UPDATE its stock to the Excel value
                        // This takes precedence over the default 300
                        await connection.execute(
                            'UPDATE instruments SET cssdStock = ?, totalStock = ? WHERE id = ?',
                            [stock, stock, id]
                        );
                        // console.log(`  Updated Stock: ${name} = ${stock}`);
                    } else {
                        // Item doesn't exist yet? Create it with this specific stock.
                        const category = name.toUpperCase().includes('SET') ? 'Sets' : 'Single';
                        await getOrCreateInstrument(name, category, stock);
                    }
                }
            }
        }

        console.log('\nMigration Complete!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

importData();
