const db = require('./db');

async function checkColumns() {
    try {
        console.log('Checking columns in instruments table...');
        // Postgres query to check columns
        const query = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'instruments';
        `;
        const [rows] = await db.query(query);
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkColumns();
