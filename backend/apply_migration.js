const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'steritrack',
    multipleStatements: true
};

(async () => {
    try {
        console.log('Connecting to database...');
        const connection = await mysql.createConnection(dbConfig);

        const sqlPath = path.join(__dirname, 'migration_add_hybrid_tracking.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await connection.query(sql);

        console.log('Migration successful.');
        await connection.end();
    } catch (error) {
        console.error('Migration failed:', error);
    }
})();
