// simulate_activity.js
// Script to generate random activity in SteriTrack for evaluation purposes.
// Usage: node simulate_activity.js [count] (default 20)

const db = require('./db'); // Direct DB access for ID retrieval
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:3000/api';
const COUNT = process.argv[2] ? parseInt(process.argv[2]) : 20;

// Native fetch wrapper with cookie handling/auth
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const res = await fetch(`${BASE_URL}/${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!res.ok) {
            const txt = await res.text();
            // console.error(`Failed ${method} ${endpoint}: ${res.status} - ${txt}`);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.error(`Error ${method} ${endpoint}:`, e.message);
        return null;
    }
}

async function run() {
    console.log(`🤖 Starting SteriTrack Activity Simulator (${COUNT} actions)...`);

    // 1. Login Agents
    const agents = {
        admin: { creds: { username: 'admin', password: 'admin' }, token: null }, // Adjusted password
        cssd: { creds: { username: 'staff', password: '4dm1n123' }, token: null },
        nurse: { creds: { username: 'nurse', password: '4dm1n123' }, token: null }
    };

    for (const role in agents) {
        const res = await apiCall('users/login', 'POST', agents[role].creds);
        if (res && res.token) {
            agents[role].token = res.token;
            console.log(`✅ Logged in as ${role}`);
        } else {
            console.error(`❌ Failed login for ${role}`);
            // If staff/nurse fail, fallback to admin for everything or skip
        }
    }

    // 2. Get Master Data (Instruments, Units)
    const instruments = await apiCall('instruments', 'GET', null, agents.admin.token);
    const units = await apiCall('units', 'GET', null, agents.admin.token);

    if (!instruments || !units) {
        console.error("❌ Failed to fetch master data. Aborting.");
        process.exit(1);
    }

    // Filterable lists
    const unitIds = units.map(u => u.id);
    const itemIds = instruments.map(i => i.id);

    console.log(`Loaded ${instruments.length} instruments and ${units.length} units.`);

    // 3. Simulation Loop
    for (let i = 0; i < COUNT; i++) {
        const actionType = Math.floor(Math.random() * 4); // 0: Distribute, 1: Collect, 2: Wash, 3: Sterilize

        try {
            switch (actionType) {
                case 0: // DISTRIBUTE (Admin/CSSD)
                    await simulateTransaction('DISTRIBUTE', agents.admin.token, unitIds, itemIds);
                    break;
                case 1: // COLLECT (Admin/CSSD)
                    await simulateTransaction('COLLECT', agents.admin.token, unitIds, itemIds);
                    break;
                case 2: // WASH (CSSD)
                    if (agents.cssd.token) await simulateWash(agents.cssd.token, itemIds);
                    else await simulateWash(agents.admin.token, itemIds);
                    break;
                case 3: // STERILIZE (CSSD)
                    if (agents.cssd.token) await simulateSterilize(agents.cssd.token, itemIds);
                    else await simulateSterilize(agents.admin.token, itemIds);
                    break;
            }

            if (i % 5 === 0) process.stdout.write('.');
            await new Promise(r => setTimeout(r, 200)); // Slight delay
        } catch (err) {
            console.error('Step failed:', err.message);
        }
    }

    console.log('\n✨ Simulation Complete!');
}

async function simulateTransaction(type, token, unitIds, itemIds) {
    const unitId = unitIds[Math.floor(Math.random() * unitIds.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];

    for (let k = 0; k < numItems; k++) {
        items.push({
            instrumentId: itemIds[Math.floor(Math.random() * itemIds.length)],
            count: Math.floor(Math.random() * 5) + 1,
            itemType: 'SINGLE'
        });
    }

    const payload = {
        type: type,
        unitId: unitId,
        items: items,
        setItems: [],
        packIds: []
    };

    const res = await apiCall('transactions', 'POST', payload, token);
    // console.log(`   [${type}] Unit ${unitId}: ${res ? 'OK' : 'FAIL'}`);
}

async function simulateWash(token, itemIds) {
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];

    for (let k = 0; k < numItems; k++) {
        items.push({
            instrumentId: itemIds[Math.floor(Math.random() * itemIds.length)],
            quantity: Math.floor(Math.random() * 5) + 1
        });
    }

    const payload = { items, operator: 'AutoBot' };
    const res = await apiCall('sterilization/wash', 'POST', payload, token);
    // console.log(`   [WASH] ${items.length} types: ${res ? 'OK' : 'FAIL'}`);
}

async function simulateSterilize(token, itemIds) {
    const machines = ['Autoclave 1', 'Autoclave 2', 'Plasma 1'];
    const machine = machines[Math.floor(Math.random() * machines.length)];

    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];

    for (let k = 0; k < numItems; k++) {
        items.push({
            instrumentId: itemIds[Math.floor(Math.random() * itemIds.length)],
            quantity: Math.floor(Math.random() * 5) + 1
        });
    }

    const payload = {
        items,
        operator: 'AutoBot',
        machine,
        status: 'SUCCESS'
    };

    const res = await apiCall('sterilization/sterilize', 'POST', payload, token);
    // console.log(`   [STERILIZE] ${machine}: ${res ? 'OK' : 'FAIL'}`); 
}

run();
