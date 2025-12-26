const { pool } = require('./db');

async function inspect() {
    try {
        console.log('🔍 Inspecting Tables...');
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            ORDER BY table_name, column_name;
        `);

        console.table(res[0]); // db.js returns [rows, fields]
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
