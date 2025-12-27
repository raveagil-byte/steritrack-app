const db = require('./db');
const fs = require('fs');
const path = require('path');

async function migrateSchema() {
    try {
        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon to run statement by statement
        // Note: Simple split might break if semicolon is inside text/function
        // But for our schema it should be fine.
        const statements = schemaSql.split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} statements.`);

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i];
                // Postgres doesn't like INT(11) or engine=InnoDB etc if there are any MySQL specific residuals
                // Our schema.sql looks generic/postgres compatible enough (VARCHAR, INT, TEXT)
                if (stmt.toUpperCase().startsWith('INSERT')) {
                    // Skip inserts for migration to avoid duplicates/errors if data exists
                    // Or use INSERT IGNORE logic which is MySQL specific
                    // Postgres uses ON CONFLICT DO NOTHING
                    // Let's replace INSERT IGNORE with INSERT ... ON CONFLICT
                    let pgStmt = stmt.replace(/INSERT IGNORE INTO/gi, 'INSERT INTO');
                    if (pgStmt !== stmt) {
                        pgStmt += ' ON CONFLICT DO NOTHING';
                    }
                    console.log(`Executing stmt ${i + 1} (Data Seed)...`);
                    await connection.query(pgStmt);
                } else {
                    // Table Creations
                    console.log(`Executing stmt ${i + 1} (Structure)...`);
                    // Handle MySQL 'INT AUTO_INCREMENT' vs Postgres 'SERIAL' differentiation if needed
                    // But our schema uses VARCHAR IDs mostly.
                    await connection.query(stmt);
                }
            }

            await connection.commit();
            console.log("✅ Schema Migration Completed Successfully.");

        } catch (err) {
            await connection.rollback();
            console.error("❌ Migration Failed:", err.message);
            // console.error("Statement:", statements[i]); // i not accessible here easily
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        process.exit();
    }
}

migrateSchema();
