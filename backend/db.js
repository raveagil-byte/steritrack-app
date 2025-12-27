const { Pool, types } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Env loading logic
const envPath = path.resolve(__dirname, '../.env.local');
const rootEnv = path.resolve(__dirname, '../.env');
const localEnv = path.resolve(__dirname, '.env');

if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
} else {
    dotenv.config();
}

console.log(`🔌 Initializing Postgres Connection... Host: ${process.env.DB_HOST}, User: ${process.env.DB_USER}, DB: ${process.env.DB_NAME}`);

// Fix BigInt parsing (COUNT/SUM returns string in pg)
types.setTypeParser(20, (val) => parseInt(val, 10)); // int8

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'steritrack',
    ssl: (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : undefined,
    max: 20, // Increase pool size for local dev/testing
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
});

// Mapping for Lowercase -> CamelCase
const FIELD_MAP = {
    'unitid': 'unitId',
    'instrumentid': 'instrumentId',
    'setid': 'setId',
    'transactionid': 'transactionId',
    'packid': 'packId',
    'requestid': 'requestId',
    'batchid': 'batchId',
    'versionid': 'versionId',
    'targetunitid': 'targetUnitId',
    'roleid': 'roleId',
    'userid': 'userId',
    'qrcode': 'qrCode',
    'totalstock': 'totalStock',
    'cssdstock': 'cssdStock',
    'dirtystock': 'dirtyStock',
    'packingstock': 'packingStock',
    'brokenstock': 'brokenStock',
    'createdby': 'createdBy',
    'validatedby': 'validatedBy',
    'validatedat': 'validatedAt',
    'validationstatus': 'validationStatus',
    'validationnotes': 'validationNotes',
    'brokencount': 'brokenCount',
    'missingcount': 'missingCount',
    'itemtype': 'itemType',
    'receivedcount': 'receivedCount',
    'receivedquantity': 'receivedQuantity',
    'verifiedbroken': 'verifiedBroken',
    'verifiedmissing': 'verifiedMissing',
    'verificationnotes': 'verificationNotes',
    'createdat': 'createdAt',
    'expiresat': 'expiresAt',
    'packedby': 'packedBy',
    'starttime': 'startTime',
    'endtime': 'endTime',
    'requestedby': 'requestedBy',
    'is_serialized': 'isSerialized',
    'last_updated': 'lastUpdated',
    'version_number': 'versionNumber',
    'effective_date': 'effectiveDate'
};

function mapRow(row) {
    if (!row) return row;
    const newRow = {};
    for (const key in row) {
        const mappedKey = FIELD_MAP[key] || key;
        newRow[mappedKey] = row[key];
    }
    return newRow;
}

// Helper to convert ? to $n and handle basic syntax diffs
function convertQuery(sql, params) {
    if (!sql) return { text: '', values: [] };

    // 1. Replace ? with $1, $2, etc.
    let paramIndex = 1;
    let convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

    // 2. STRIP Backticks ` (Fix for MySQL -> Postgres identifiers)
    // Stripping backticks allows Postgres to case-fold identifiers to lowercase, matching our schema.
    convertedSql = convertedSql.replace(/`/g, '');

    // 3. SPECIAL HANDLE FOR ON DUPLICATE
    if (convertedSql.includes('ON DUPLICATE KEY UPDATE')) {
        console.warn('⚠️ WARNING: MySQL ON DUPLICATE KEY UPDATE detected in query. This may fail in PostgreSQL.');
    }

    return { text: convertedSql, values: params };
}

// Wrapper for Pool Query
const query = async (sql, params) => {
    const { text, values } = convertQuery(sql, params);
    try {
        const result = await pool.query(text, values);

        // Map rows back to camelCase
        const mappedRows = result.rows ? result.rows.map(mapRow) : [];

        // Return [rows, fields] to match mysql2 signature
        return [mappedRows, result.fields];
    } catch (err) {
        console.error('❌ Database Query Error:', err.message);
        console.error('   SQL:', text);
        console.error('   Params:', values);
        throw err;
    }
};

// Wrapper for Transaction/Connection
const getConnection = async () => {
    const client = await pool.connect();

    // Prevent double-wrapping if client is reused from pool and wasn't cleaned up (though we clean up now)
    if (client._isWrapped) {
        return client;
    }

    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);

    client.query = async (sql, params) => {
        const { text, values } = convertQuery(sql, params);
        try {
            const result = await originalQuery(text, values);
            const mappedRows = result.rows ? result.rows.map(mapRow) : [];
            return [mappedRows, result.fields];
        } catch (err) {
            console.error('❌ Client Query Error:', err.message);
            console.error('   SQL:', text);
            throw err;
        }
    };

    client.beginTransaction = async () => await originalQuery('BEGIN');
    client.commit = async () => await originalQuery('COMMIT');
    client.rollback = async () => await originalQuery('ROLLBACK');

    client.release = () => {
        // Restore original methods before releasing to pool
        client.query = originalQuery;
        client.release = originalRelease;
        delete client.beginTransaction;
        delete client.commit;
        delete client.rollback;
        delete client._isWrapped;

        // Call original release
        return originalRelease();
    };

    client._isWrapped = true;
    return client;
};

module.exports = {
    query,
    getConnection,
    pool
};
