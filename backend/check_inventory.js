const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'steritrack'
};

(async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('SELECT id, name, totalStock, category FROM instruments');
        console.log('Current Inventory:', JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
