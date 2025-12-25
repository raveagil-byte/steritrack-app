const db = require('./db');

async function findIds() {
    try {
        console.log("FINDING NAMES:");

        // Cek lagi dengan search lebih longgar
        const keywords = ['Bak', 'Gunting', 'Kom', 'Pinset'];

        for (const k of keywords) {
            const [rows] = await db.query(`SELECT id, name FROM instruments WHERE name LIKE ? LIMIT 10`, [`%${k}%`]);
            console.log(`--- ${k} ---`);
            rows.forEach(r => console.log(`${r.id}: ${r.name}`));
        }
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
findIds();
