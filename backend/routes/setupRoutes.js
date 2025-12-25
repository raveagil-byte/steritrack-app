const express = require('express');
const router = express.Router();
const db = require('../db');

// Endpoint khusus untuk menjalankan migrasi database via Postman/Browser
router.get('/migrate-usage-logs', async (req, res) => {
    // Hardening: Disable in production
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Setup/Migration routes are disabled in production.' });
    }

    try {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS usage_logs (
                id VARCHAR(50) PRIMARY KEY,
                timestamp BIGINT NOT NULL,
                unit_id VARCHAR(50) NOT NULL,
                patient_id VARCHAR(50),
                patient_name VARCHAR(100),
                doctor_name VARCHAR(100),
                procedure_id VARCHAR(50),
                items TEXT, 
                logged_by VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await db.query(createTableSQL);

        res.status(200).json({
            success: true,
            message: 'Tabel usage_logs berhasil dibuat (atau sudah ada) di Database Cloud!'
        });

    } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
