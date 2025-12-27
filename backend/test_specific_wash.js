const db = require('./db');
// fetch is global in Node 18+

async function runTest() {
    try {
        console.log('Checking Item 1766808785924...');
        const [rows] = await db.query('SELECT * FROM instruments WHERE id = ?', ['1766808785924']);

        if (rows.length === 0) {
            console.log('Item NOT FOUND in instruments table. Checking assets...');
            const [assets] = await db.query('SELECT * FROM instrument_assets WHERE id = ?', ['1766808785924']);
            if (assets.length === 0) {
                console.error('Item not found in instruments or instrument_assets.');
                process.exit(1);
            }
            console.log('Found as ASSET:', assets[0]);
            // It's an asset. Ensure it is DIRTY?
            // The controller logic:
            // if asset, checks instrument_assets status.
            // Also adds to Master Counter.
            // Then checks Master Stock dirtyStock.

            // We need to know the parent instrument ID to check dirty stock.
            const parentId = assets[0].instrumentid;
            console.log('Parent Instrument ID:', parentId);

            // Ensure parent has dirty stock
            await db.query('UPDATE instruments SET dirtyStock = dirtyStock + 1 WHERE id = ?', [parentId]);
            console.log('Added 1 dirtyStock to parent for testing.');

        } else {
            console.log('Found as MASTER Instrument:', rows[0]);
            if (rows[0].dirtyStock < 1) {
                console.log('DirtyStock is 0, updating to 1 for test...');
                await db.query('UPDATE instruments SET dirtyStock = 1 WHERE id = ?', ['1766808785924']);
            }
        }

        console.log('Sending Wash Request...');
        const response = await fetch('http://localhost:3000/api/sterilization/wash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{ instrumentId: '1766808785924', quantity: 1 }],
                operator: 'SystemTest'
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        process.exit();
    }
}

runTest();
