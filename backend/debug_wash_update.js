const db = require('./db');

async function testWashUpdate() {
    try {
        console.log('Connecting...');
        const connection = await db.getConnection();
        await connection.beginTransaction();

        const assetsToUpdate = ['asset-1', 'asset-2']; // Dummy IDs
        const timestamp = Date.now();

        console.log('Testing Asset Update...');
        // Test 1: Update Assets
        // Note: Using a safe query that won't actually match if IDs don't exist, but tests syntax
        await connection.query(
            "UPDATE instrument_assets SET status = 'PACKING', updatedat = ? WHERE id = ANY(?)",
            [timestamp, assetsToUpdate]
        );
        console.log('Asset Update SQL OK');

        // Test 2: Update Instruments
        const chunkIds = ['inst-1', 'inst-2'];
        const aggregatedUpdates = { 'inst-1': 1, 'inst-2': 2 };

        let query = 'UPDATE instruments SET dirtyStock = dirtyStock - CASE id ';
        const params = [];

        chunkIds.forEach(mId => {
            query += 'WHEN ? THEN ? ';
            params.push(mId, aggregatedUpdates[mId]);
        });

        query += 'END, packingStock = packingStock + CASE id ';

        chunkIds.forEach(mId => {
            query += 'WHEN ? THEN ? ';
            params.push(mId, aggregatedUpdates[mId]);
        });

        query += 'END WHERE id = ANY(?)';
        params.push(chunkIds);

        console.log('Query:', query);
        console.log('Params:', params);

        await connection.query(query, params);
        console.log('Instrument Update SQL OK');

        await connection.rollback();
        console.log('Rollback OK');
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

testWashUpdate();
