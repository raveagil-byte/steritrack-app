const db = require('./backend/db');
const { v4: uuidv4 } = require('uuid');

async function testUuidQuery() {
    try {
        console.log('Testing UUID function...');
        // Try selecting UUID() - works if extension enabled in PG or MySQL native
        // In PG usually uuid_generate_v4() or similar if enabled, OR we can't use DB-side generation easily without ext.
        await db.query('SELECT UUID()');
        console.log('UUID() function exists in DB.');
    } catch (err) {
        console.log('UUID() function FAILED:', err.message);

        try {
            // Check gen_random_uuid in PG 13+
            await db.query('SELECT gen_random_uuid()');
            console.log('gen_random_uuid() function exists.');
        } catch (err2) {
            console.log('gen_random_uuid() function FAILED:', err2.message);
        }
    }
}

testUuidQuery().then(() => process.exit());
