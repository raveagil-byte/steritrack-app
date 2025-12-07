const db = require('../db');
const fs = require('fs');
const path = require('path');

exports.initDb = async (req, res) => {
    try {
        const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
        await db.query(schema);
        res.json({ message: 'Database initialized successfully with schema and default data.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error initializing database', details: err.message });
    }
};

exports.resetSystem = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Delete all transactional, log, and functional data
        await connection.query('DELETE FROM transaction_items');
        await connection.query('DELETE FROM transactions');
        await connection.query('DELETE FROM logs');
        await connection.query('DELETE FROM instrument_set_items');
        await connection.query('DELETE FROM instrument_sets');
        await connection.query('DELETE FROM instrument_unit_stock');
        await connection.query('DELETE FROM instruments');
        await connection.query('DELETE FROM units');

        // 2. Clear users but KEEP the default admin or recreate it
        await connection.query('DELETE FROM users');

        // 3. Re-create default Admin so user is not locked out
        await connection.query(`
            INSERT INTO users (id, username, password, name, role, unitId) 
            VALUES ('admin-default', 'admin', '123', 'System Admin', 'ADMIN', NULL)
        `);

        await connection.commit();
        res.json({ message: 'System reset complete. Default Admin (admin/123) restored.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};
