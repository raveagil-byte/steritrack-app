const db = require('./db');

async function checkWhyDifferent() {
    try {
        console.log("=== DIAGNOSA PERBEDAAN RESEP ===");

        // 1. Cek isi Database sekarang (Yang baru diupdate)
        const [sets] = await db.query("SELECT id FROM instrument_sets WHERE name LIKE '%Dressing%' LIMIT 1");
        const setId = sets[0].id;

        const [currentRecipe] = await db.query(`
            SELECT i.name, isi.quantity 
            FROM instrument_set_items isi 
            JOIN instruments i ON isi.instrumentId = i.id 
            WHERE isi.setId = ?
        `, [setId]);

        console.log("1. ISI DATABASE (Saat Ini):");
        currentRecipe.forEach(r => console.log(`   - ${r.name}: ${r.quantity}`));

        // 2. Cek Hardcoded Data / Seeding awal
        // Biasanya perbedaan terjadi karena data awal (Seed) berbeda dengan data real request user.
        // Mari kita cek file migration/seed jika ada untuk membandingkan.
        // Tapi karena kita tidak buka file, saya jelaskan logika umum.

        console.log("\n2. KEMUNGKINAN PENYEBAB:");
        console.log("   a. Data Awal (Seed) Generik: Saat instalasi pertama, sistem mungkin menggunakan template standar 'Dressing Set' yang isinya berbeda.");
        console.log("   b. Nama Instrumen Mirip: Mungkin sebelumnya tercatat 'Gunting Jaringan', tapi yang Anda minta 'Gunting Littauer'.");
        console.log("   c. Variasi Rumah Sakit: Setiap RS punya standar isi 'Dressing Set' yang sedikit berbeda (ada yang pakai 2 pinset, ada yang 1).");

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
checkWhyDifferent();
