import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from "module";
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'cssd_november.xlsx');
const outputPath = path.join(__dirname, 'analysis_result.txt');

const KEYWORDS = ['TANGGAL', 'DATE', 'NAMA', 'ALAT', 'ITEM', 'UNIT', 'RUANGAN', 'QTY', 'JUMLAH'];

function findHeaderRow(data) {
    for (let i = 0; i < Math.min(data.length, 25); i++) {
        const row = data[i];
        if (!row) continue;
        const rowString = JSON.stringify(row).toUpperCase();
        let matchCount = 0;
        KEYWORDS.forEach(kw => {
            if (rowString.includes(kw)) matchCount++;
        });
        if (matchCount >= 2) return i;
    }
    return -1;
}

let outputBuffer = "";
function log(msg) {
    outputBuffer += msg + "\n";
    console.log(msg);
}

try {
    const workbook = XLSX.readFile(filePath);

    ['KOTOR', 'STOCK STERIL', 'RUANG PENYIMPANAN'].forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        log(`\n\n=== ANALYZING: ${sheetName} ===`);
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headerIndex = findHeaderRow(data);
        if (headerIndex !== -1) {
            log(`Found Header at Row ${headerIndex + 1}:`);
            log(JSON.stringify(data[headerIndex], null, 2));

            // Look for next non-empty row as sample
            let sampleIndex = headerIndex + 1;
            while (sampleIndex < data.length && (!data[sampleIndex] || data[sampleIndex].length === 0)) {
                sampleIndex++;
            }

            if (data[sampleIndex]) {
                log(`\nExample Data (Row ${sampleIndex + 1}):`);
                log(JSON.stringify(data[sampleIndex], null, 2));
            }
        } else {
            log("Could not auto-detect header row.");
            log("First 5 rows dump:");
            data.slice(0, 5).forEach(row => log(JSON.stringify(row)));
        }
    });

    fs.writeFileSync(outputPath, outputBuffer, 'utf8');
    console.log(`\nAnalysis written to ${outputPath}`);

} catch (error) {
    console.error(error.message);
}
