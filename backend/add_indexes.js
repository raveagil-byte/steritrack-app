const db = require('./db');

const applyIndexes = async () => {
    try {
        console.log('🚀 Applying Database Indexes for Performance...');

        const indexes = [
            // Foreign Keys & Joins (Crucial for Postgres)
            `CREATE INDEX IF NOT EXISTS idx_users_unitid ON users(unitid)`,
            `CREATE INDEX IF NOT EXISTS idx_instrument_set_items_setid ON instrument_set_items(setid)`,
            `CREATE INDEX IF NOT EXISTS idx_instrument_set_items_instid ON instrument_set_items(instrumentid)`,
            `CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_instid ON inventory_snapshots(instrumentid)`,
            `CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_unitid ON inventory_snapshots(unitid)`,

            // Transactions (Heavy Read/Write)
            `CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp)`,
            `CREATE INDEX IF NOT EXISTS idx_transactions_unitid ON transactions(unitid)`,
            `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`,
            `CREATE INDEX IF NOT EXISTS idx_transaction_items_transid ON transaction_items(transactionid)`,
            `CREATE INDEX IF NOT EXISTS idx_transaction_items_instid ON transaction_items(instrumentid)`,

            // Audit Logs (Heavy Read/Sort)
            `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`,
            `CREATE INDEX IF NOT EXISTS idx_audit_logs_userid ON audit_logs(userid)`,
            `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`,
            `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entitytype, entityid)`,

            // Instruments Search
            `CREATE INDEX IF NOT EXISTS idx_instruments_name ON instruments(name)`,
            `CREATE INDEX IF NOT EXISTS idx_instruments_category ON instruments(category)`
        ];

        for (const sql of indexes) {
            process.stdout.write(`Applying index... `);
            await db.query(sql);
            console.log(`✅ OK`);
        }

        console.log('🎉 All indexes applied successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error applying indexes:', err);
        process.exit(1);
    }
};

applyIndexes();
