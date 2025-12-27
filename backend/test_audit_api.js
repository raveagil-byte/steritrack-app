// Native fetch is available in Node 18+

async function testApi() {
    const BASE_URL = 'http://localhost:3000/api';

    // 1. Login
    console.log('Logging in as admin...');
    const loginRes = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testagent', password: 'password123' }) // User created by subagent
    });

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        return;
    }

    const userData = await loginRes.json();
    const token = userData.token;
    console.log('Login successful. Token acquired.');

    // 2. Test Combined Logs
    console.log('Testing /api/audit-logs/combined...');
    const logsRes = await fetch(`${BASE_URL}/audit-logs/combined?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!logsRes.ok) {
        console.error(`API Error: ${logsRes.status} ${logsRes.statusText}`);
        const errorText = await logsRes.text();
        console.error('Error Body:', errorText);
    } else {
        const data = await logsRes.json();
        console.log('API Success!');
        console.log(`Total logs: ${data.pagination.total}`);
        console.log('First log sample:', data.data[0]);
    }
}

testApi().catch(console.error);
