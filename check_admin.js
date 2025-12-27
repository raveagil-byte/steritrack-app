const db = require('./backend/db');

async function checkAdmin() {
    try {
        console.log('Checking for admin user...');
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', ['admin']);

        if (users.length === 0) {
            console.log('Admin user NOT FOUND.');
        } else {
            console.log('Admin user FOUND.');
            const user = users[0];
            console.log('ID:', user.id);
            console.log('Role:', user.role);
            console.log('Is Active:', user.is_active);
            console.log('Password Hash starts with $2?', user.password.startsWith('$2'));
            console.log('Raw Password Length:', user.password.length);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAdmin().then(() => process.exit());
