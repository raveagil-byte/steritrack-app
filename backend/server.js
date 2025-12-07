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

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Application Routes
// Note: systemRoutes handles its own paths inside
app.use('/', systemRoutes);

app.use('/api/users', usersRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/instruments', instrumentsRoutes);
app.use('/api/sets', setsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/requests', require('./routes/requestsRoutes'));
app.use('/api/sterilization', require('./routes/sterilizationRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/logs', logsRoutes);

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
