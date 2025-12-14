import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'cssd_november.xlsx');

try {
    const workbook = XLSX.readFile(filePath);

    // 1. EXTRACT EXAMPLES OF TOOL NAMES
    const sterilSheet = workbook.Sheets['STOCK STERIL'];
    if (sterilSheet) {
        console.log('\n=== CONTOH NAMA ALAT (dari STOCK STERIL) ===');
        const data = XLSX.utils.sheet_to_json(sterilSheet, { header: 1 });

        // Based on previous analysis, header was around row 10 (index 9)
        // Data usually starts a couple of rows after. 
        // We'll look for the row starting with "NAMA ALAT" again to be safe.
        let startRow = -1;
        for (let i = 0; i < 20; i++) {
            if (data[i] && data[i][0] === 'NAMA ALAT') {
                startRow = i + 1; // +1 to skip header
                break;
            }
        }

        if (startRow !== -1) {
            const toolNames = [];
            for (let i = startRow; i < Math.min(startRow + 20, data.length); i++) {
                const row = data[i];
                if (row && row[0] && row[0] !== 'EB') { // Ignoring 'EB' which seemed to be a category code in previous view
                    // In previous output, "DRESSING SET" was at index 2 (Col C). Wait, let's re-verify column index.
                    // Header row 9: ["NAMA ALAT", null, null, "JML STOCK"...]
                    // Row 11: ["EB", "S T E A M", "DRESSING SET", 4 ...]
                    // It seems the actual name is in Column Index 2 (0-based) -> Column C.
                    // Column A (0) seems to be a code like "EB".
                    const name = row[2];
                    if (name) toolNames.push(name);
                }
            }
            console.log(toolNames.join('\n'));
        }
    }

    // 2. CHECK FOR SET CONTENTS IN OTHER SHEETS
    ['stock', 'TIDAK LENGKAP'].forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
            console.log(`\n=== CHECKING SHEET: ${sheetName} FOR SET DETAILS ===`);
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            // Print first 10 rows to see if it lists item contents
            data.slice(0, 10).forEach(row => console.log(JSON.stringify(row)));
        }
    });

} catch (error) {
    console.error(error.message);
}
