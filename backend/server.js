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
const db = require('./db');

const app = express();
app.set('trust proxy', 1); // Required for Vercel/Heroku logic to get real IP
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression'); // Performance Optimization

// Enable Gzip Compression
app.use(compression());

// Security Middleware
app.use(helmet());

// Hardening: STRICT CORS
// In production, FRONTEND_URL should be set (e.g., https://steritrack.vercel.app)
// For local PWA testing, we allow '*' if not in production to support mobile IPs (e.g., 192.168.x.x)
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction && process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : '*';

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter); // Apply to all API routes

const PORT = process.env.PORT || 3000;

app.get('/api/debug-db', async (req, res) => {
    // Hardening: Disable full debug info in production
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Debug endpoint disabled in production' });
    }

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

const verifyToken = require('./middleware/authMiddleware');

// Application Routes
// Note: systemRoutes handles its own paths inside (Public Frontend)
app.use('/', systemRoutes);

// Users has its own mixed internal protection (Login=Public, Others=Private)
app.use('/api/users', usersRoutes);

// Protected API Routes (Auth Required)
app.use('/api/units', unitsRoutes);
app.use('/api/instruments', verifyToken, instrumentsRoutes);
app.use('/api/sets', verifyToken, setsRoutes);
app.use('/api/audit', verifyToken, require('./routes/auditRoutes'));
app.use('/api/transactions', verifyToken, transactionsRoutes);
const checkRole = require('./middleware/roleMiddleware');

app.use('/api/requests', verifyToken, require('./routes/requestsRoutes'));
app.use('/api/sterilization', verifyToken, checkRole(['ADMIN', 'CSSD']), require('./routes/sterilizationRoutes'));
app.use('/api/analytics', verifyToken, require('./routes/analyticsRoutes'));
app.use('/api/logs', verifyToken, logsRoutes);
app.use('/api/audit-logs', verifyToken, auditLogsRoutes);
app.use('/api/ai', verifyToken, require('./routes/aiRoutes'));
app.use('/api/assets', verifyToken, require('./routes/assetsRoutes'));
app.use('/api/packs', verifyToken, require('./routes/packsRoutes'));
app.use('/api/usage', verifyToken, require('./routes/usageRoutes'));
app.use('/api/overdue', verifyToken, require('./routes/overdueRoutes'));
// Public setup route for easy migration
app.use('/api/setup', require('./routes/setupRoutes'));

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack); // Log full stack on server

    // Hardening: Hide stack trace in production
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(500).json({
        error: 'Internal Server Error',
        message: isProduction ? 'Terjadi kesalahan internal pada server.' : err.message,
        ...(isProduction ? {} : { stack: err.stack })
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

        // Keep-Alive Mechanism for Aiven (pings every 4 minutes)
        setInterval(async () => {
            try {
                await db.query('SELECT 1');
                // console.log('Keep-alive ping sent.');
            } catch (err) {
                console.error('Keep-alive ping failed:', err.message);
            }
        }, 4 * 60 * 1000);
    });
}

module.exports = app;
