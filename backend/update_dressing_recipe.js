const db = require('./db');

async function updateRecipe() {
    try {
        console.log("=== UPDATING DRESSING SET RECIPE ===");

        // 1. Get Set ID
        const [sets] = await db.query("SELECT id FROM instrument_sets WHERE name LIKE '%Dressing%' LIMIT 1");
        if (sets.length === 0) { console.log("Set Not Found"); process.exit(1); }
        const setId = sets[0].id;
        console.log("Set ID:", setId);

        // 2. Identify Item IDs by Name Match (Manual selection based on dump)
        // I will use LIKE to be safer if exact names differ slightly
        async function getId(namePattern) {
            const [rows] = await db.query(`SELECT id, name FROM instruments WHERE name LIKE ? LIMIT 1`, [`%${namePattern}%`]);
            if (rows.length > 0) return rows[0].id;
            throw new Error(`Item not found: ${namePattern}`);
        }

        const items = [
            { name: 'Bak Instrumen', qty: 1 }, // Bak Instrumen Sedang
            { name: 'Gunting Littauer', qty: 1 },
            { name: 'Kom', qty: 2 }, // Kom Kecil
            { name: 'Pinset Anatomis', qty: 1 },
            { name: 'Pinset Cirurgis', qty: 1 }
        ];

        const finalItems = [];
        for (const i of items) {
            try {
                const id = await getId(i.name);
                finalItems.push({ id, qty: i.qty, name: i.name });
                console.log(`Matched: ${i.name} -> ${id}`);
            } catch (e) {
                console.log(`Failed to match: ${i.name}. Skipping.`);
            }
        }

        // 3. Update DB
        const conn = await db.getConnection();
        await conn.beginTransaction();

        // Clear old recipe
        await conn.query('DELETE FROM instrument_set_items WHERE setId = ?', [setId]);

        // Insert new recipe
        for (const item of finalItems) {
            await conn.query('INSERT INTO instrument_set_items (setId, instrumentId, quantity) VALUES (?, ?, ?)',
                [setId, item.id, item.qty]);
        }

        await conn.commit();
        console.log("✅ Recipe Updated Successfully!");
        conn.release();
        process.exit();

    } catch (e) { console.error(e); process.exit(1); }
}
updateRecipe();
