import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from "module";
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'cssd_november.xlsx');
const outputReport = path.join(__dirname, 'tool_report.txt');

let report = "";
function log(msg) {
    report += msg + "\n";
    console.log(msg);
}

try {
    const workbook = XLSX.readFile(filePath);

    // 1. GET EXAMPLES OF TOOL NAMES FROM 'STOCK STERIL'
    const sterilSheet = workbook.Sheets['STOCK STERIL'];
    if (sterilSheet) {
        log('=== CONTOH NAMA ALAT (Ditemukan di Sheet STOCK STERIL) ===');
        const data = XLSX.utils.sheet_to_json(sterilSheet, { header: 1 });

        // Find header row based on known structure
        // Row 9 (index 8) or 10 (index 9) usually has "NAMA ALAT"
        let nameColIndex = 2; // Based on previous observation: Col C
        let startRow = 10; // Start looking for data from row 11 onwards

        const uniqueNames = new Set();
        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            // Must have a name and maybe a category code in col A?
            // Row 11: ["EB", "S T E A M", "DRESSING SET", ...]
            if (row && row[nameColIndex]) {
                const name = row[nameColIndex].toString().trim();
                // Filter out obviously non-tool text
                if (name.length > 2 && name !== "NAMA ALAT" && !name.includes("PETUGAS")) {
                    uniqueNames.add(name);
                }
            }
            if (uniqueNames.size >= 15) break; // Just get 15 examples
        }

        Array.from(uniqueNames).forEach(n => log(`- ${n}`));
    }

    // 2. SEARCH FOR "ISI" / CONTENTS OF SETS
    // We check 'stock' and 'TIDAK LENGKAP' to see if they list sub-items.
    ['stock', 'TIDAK LENGKAP'].forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        log(`\n\n=== MEMERIKSA SHEET: ${sheetName} (Mencari Detail Isi Set) ===`);
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Print first 15 rows to check structure manually
        for (let i = 0; i < Math.min(15, data.length); i++) {
            log(`Row ${i}: ${JSON.stringify(data[i])}`);
        }
    });

    fs.writeFileSync(outputReport, report);
    console.log(`Report saved to ${outputReport}`);

} catch (error) {
    console.error(error.message);
}
