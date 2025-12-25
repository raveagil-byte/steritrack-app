const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function testSimpleInsert() {
    console.log("Testing Simple Insert...");
    const conn = await db.getConnection();
    try {
        const id = uuidv4();
        const unitId = 'Manual-Unit'; // Ensure this unit exists or create it?
        // Create unit first to be safe
        await conn.query(`INSERT IGNORE INTO units (id, name, type) VALUES (?, 'ManUnit', 'WARD')`, [unitId]);

        console.log("Inserting transaction WITH qrCode...");
        await conn.query('INSERT INTO transactions (id, timestamp, type, status, unitId, qrCode) VALUES (?, ?, ?, ?, ?, ?)',
            [id, Date.now(), 'DISTRIBUTE', 'COMPLETED', unitId, 'TEST-QR']);

        console.log("Insert Success!");

        // Clean up
        await conn.query('DELETE FROM transactions WHERE id = ?', [id]);
        await conn.query('DELETE FROM units WHERE id = ?', [unitId]);

    } catch (e) {
        console.error("Insert Failed!", e);
        console.error("SQL Code:", e.code);
        console.error("SQL Msg:", e.sqlMessage);
    } finally {
        conn.release();
        process.exit();
    }
}

testSimpleInsert();
