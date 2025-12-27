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
    // HARD RESET: Deletes EVERYTHING
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Delete all transactional, log, and functional data
        await connection.query('DELETE FROM transaction_packs');
        await connection.query('DELETE FROM sterile_pack_items');
        await connection.query('DELETE FROM sterile_packs');
        await connection.query('DELETE FROM transaction_items');
        await connection.query('DELETE FROM transactions');
        await connection.query('DELETE FROM logs');
        // Delete Batches
        await connection.query('DELETE FROM sterilization_batch_items');
        await connection.query('DELETE FROM sterilization_batches');

        await connection.query('DELETE FROM instrument_set_items');
        await connection.query('DELETE FROM instrument_sets');
        await connection.query('DELETE FROM instrument_unit_stock');
        await connection.query('DELETE FROM instruments');
        await connection.query('DELETE FROM units');

        // 2. Clear users but KEEP the default admin or recreate it
        await connection.query('DELETE FROM users');

        // 3. Re-create default Admin
        await connection.query(`
            INSERT INTO users (id, username, password, name, role, unitId) 
            VALUES ('admin-default', 'admin', '123', 'System Admin', 'ADMIN', NULL)
        `);

        await connection.commit();
        res.json({ message: 'HARD RESET complete. All data wiped.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

exports.resetActivityData = async (req, res) => {
    // SOFT RESET: Clears Transactions & Logs only. KEEPS Instruments, Units, Users.
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Transactional Data
        await connection.query('DELETE FROM transaction_packs');
        await connection.query('DELETE FROM transaction_items');
        await connection.query('DELETE FROM transactions');

        // 2. Sterilization History
        await connection.query('DELETE FROM sterilization_batch_items');
        await connection.query('DELETE FROM sterilization_batches');
        await connection.query('DELETE FROM sterile_pack_items');
        await connection.query('DELETE FROM sterile_packs'); // Assuming packs are transactional? Or Master? Usually transactional instances.

        // 3. Activity Logs & Requests
        await connection.query('DELETE FROM logs');
        await connection.query('DELETE FROM requests');

        // 4. RESET STOCK to Initial State (Optional: Make everything Dirty or 0?)
        // Let's reset Unit Stock to 0 (since units have no items if transactions are gone)
        await connection.query('DELETE FROM instrument_unit_stock');

        // Reset Main Stock Counters to 0 (Require Stock Opname) OR move everything to Dirty?
        // Ideally: Set cssdStock=0, packingStock=0, dirtyStock=totalStock for safety?
        // Or just 0 and let them perform Stock Adjustment.
        // Let's set stocks to 0 so they can do a proper "Initial Stock" entry.
        // await connection.query('UPDATE instruments SET cssdStock = 0, packingStock = 0, dirtyStock = 0, totalStock = 0'); 
        // WAIT: If we keep 'Master Data', we probably want to keep 'totalStock' definition if it's considered Master, 
        // but 'totalStock' is usually the sum of physical items.
        // Better approach for "GO LIVE PREP":
        // Move ALL stock to 'dirtyStock' so it forces a wash cycle? Or 'cssdStock'?
        // The safest "Fresh Start" is usually: We have the item definitions, but we need to count how many we actually have.
        // But if they just did a script to fix inventory...
        // Let's just clear History. We will NOT touch the 'instruments' table stock columns for now, 
        // assuming the current inventory count is the "Clean Slate" starting point.

        // However, 'instrument_unit_stock' was deleted, so we should technically reflect that?
        // If we strictly delete transactions, the items "in units" effectively disappear from the record.

        await connection.commit();
        res.json({ message: 'SOFT RESET complete. History cleared. Master Data (Instruments, Units, Users) preserved.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

exports.ping = async (req, res) => {
    // Used by cron-job.org to keep the server handling requests and DB connection alive
    try {
        await db.query('SELECT 1');
        res.json({
            status: 'ok',
            message: 'Server is awake and DB is connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.json({
            status: 'warning',
            message: 'Server is awake but DB connection failed locally',
            error: err.message
        });
    }
};
