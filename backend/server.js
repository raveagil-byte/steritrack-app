const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const backendEnv = path.join(__dirname, '.env');
const rootEnv = path.join(__dirname, '../.env.local');

if (fs.existsSync(backendEnv)) {
    require('dotenv').config({ path: backendEnv });
} else if (fs.existsSync(rootEnv)) {
    require('dotenv').config({ path: rootEnv });
} else {
    require('dotenv').config();
}

// Imports
const systemRoutes = require('./routes/systemRoutes');
const usersRoutes = require('./routes/usersRoutes');
const unitsRoutes = require('./routes/unitsRoutes');
const instrumentsRoutes = require('./routes/instrumentsRoutes');
const setsRoutes = require('./routes/setsRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');
const logsRoutes = require('./routes/logsRoutes');
const auditLogsRoutes = require('./routes/auditLogsRoutes');

const app = express();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security Middleware
app.use(helmet());
app.use(cors()); // Configure strict CORS in production!
app.use(bodyParser.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter); // Apply to all API routes

const PORT = process.env.PORT || 3000;

app.get('/api/debug-db', async (req, res) => {
    const status = {
        uptime: process.uptime(),
        node: process.version,
        env_check: {
            host_exists: !!process.env.DB_HOST,
            user_exists: !!process.env.DB_USER,
            pass_len: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0
        },
        db_status: 'NOT_ATTEMPTED'
    };

    try {
        // Try require db
        const db = require('./db');
        try {
            const [rows] = await db.query('SELECT 1 + 1 AS result');
            status.db_status = 'CONNECTED';
            status.db_result = rows[0];
        } catch (dbErr) {
            status.db_status = 'CONNECTION_FAILED';
            status.db_error = dbErr.message;
            status.db_code = dbErr.code;
        }
    } catch (reqErr) {
        status.db_status = 'REQUIRE_FAILED';
        status.req_error = reqErr.message;
    }

    res.json(status);
});

// Application Routes
// Note: systemRoutes handles its own paths inside
app.use('/', systemRoutes);

app.use('/api/users', usersRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/instruments', instrumentsRoutes);
app.use('/api/sets', setsRoutes);
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/transactions', transactionsRoutes);
app.use('/api/requests', require('./routes/requestsRoutes'));
app.use('/api/sterilization', require('./routes/sterilizationRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/logs', logsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/assets', require('./routes/assetsRoutes'));
app.use('/api/packs', require('./routes/packsRoutes'));

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Process Error Handlers
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
    // In production, you might want to restart the process, 
    // but for dev/demo we log it to keep running if possible
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
