const db = require('./backend/db');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
    try {
        console.log('Resetting admin password...');
        const password = 'admin'; // Let's use 'admin' as password for simplicity in this dev env, or '4dm1n123'
        const cleanPassword = 'admin';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(cleanPassword, salt);

        // Update user 'admin' (assuming username is 'admin')
        // We use the ID found 'admin-default' or just search by username
        await db.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);

        console.log(`Password for 'admin' reset to '${cleanPassword}' (hashed).`);

    } catch (err) {
        console.error('Error:', err);
    }
}

resetAdminPassword().then(() => process.exit());
