const db = require('../db');

exports.getLogs = async (req, res) => {
    try {
        const [logs] = await db.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');
        res.json(logs);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addLog = async (req, res) => {
    const { id, timestamp, message, type } = req.body;
    try {
        await db.query('INSERT INTO logs (id, timestamp, message, type) VALUES (?, ?, ?, ?)', [id, timestamp, message, type]);
        res.json({ message: 'Log added' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
