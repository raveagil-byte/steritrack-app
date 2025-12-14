import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from "module";
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'cssd_november.xlsx');
const outputReport = path.join(__dirname, 'set_contents_report.txt');

let report = "";
function log(msg) {
    report += msg + "\n";
    console.log(msg);
}

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'TIDAK LENGKAP';
    const sheet = workbook.Sheets[sheetName];

    if (sheet) {
        log(`=== ANALISA ISI SET DARI SHEET: ${sheetName} ===`);
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Structure logic:
        // Main Set Name is often in a row with a Code in Col A (Index 0), or just defined.
        // Sub items are indented or listed below it with Ind 2 (Col C).
        // Let's iterate and try to group them.

        let currentSet = null;
        let possibleSets = [];

        // Start from row 10 where we saw "DRESSING SET"
        for (let i = 8; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;

            const colA = row[0]; // Kode / Kategori
            const colC = row[2]; // Nama Item / Set
            const colD = row[3]; // Qty (JML ISI)

            if (colC) {
                // Heuristic: If Col A has value (like "EB" or "V E N T..."), it MIGHT be a Set Header
                // OR if it's the first time we see a name after a gap.
                // Looking at previous output:
                // Row 10: ["EB", "S T E A M", "DRESSING SET"]
                // Row 11: ["V E N T...", null, "BAK INSTRUMEN SEDANG", 1] -> Wait, this looks like an item INSIDE Dressing Set?
                // The structure is tricky. Let's look closer at the pattern.

                // Let's create a raw dump of non-empty Col C rows to find the pattern visually first
                const indent = colA ? "" : "  "; // Simple visual indentation based on Col A presence
                log(`[Row ${i}] [ColA:${colA ? 'YES' : 'NO'}] [Qty:${colD}] ${indent}${colC}`);
            }
        }
    } else {
        log(`Sheet ${sheetName} not found.`);
    }

    fs.writeFileSync(outputReport, report);
    console.log(`Report saved to ${outputReport}`);

} catch (error) {
    console.error(error.message);
}
