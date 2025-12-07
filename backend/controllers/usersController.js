const db = require('../db');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = users[0];

        // Check if password matches (handles both hashed and legacy plain text during migration)
        // If password starts with $2, it's likely a hash. functionality to support plain text temporarily:
        const isMatch = await bcrypt.compare(password, user.password);

        // fallback for plain text if migration hasn't run yet (for smoother dev exp)
        if (!isMatch && password === user.password) {
            // Auto-update to hash? checking length usually safer but let's just allow it for now
            // Or better, just enforce hash. But for now, let's keep strict if possible. 
            // Let's implement Strict bcrypt compare. If it fails, fail.
            // BUT, user asked to "add auth hash", meaning existing are plain. I should probably handling the plain text case -> upgrade to hash?
        }

        if (!isMatch) {
            // Fallback: Check if it's plain text (only if not hashed format)
            if (!user.password.startsWith('$2')) {
                if (user.password === password) {
                    // It's a match on old system! Let's upgrade it!
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(password, salt);
                    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
                    // Return success
                } else {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
            } else {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, name, role, unitId, is_active FROM users'); // Exclude password
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createUser = async (req, res) => {
    const { id, username, password, name, role, unitId } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query('INSERT INTO users (id, username, password, name, role, unitId) VALUES (?, ?, ?, ?, ?, ?)',
            [id, username, hashedPassword, name, role, unitId]);
        res.json({ message: 'User created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteUser = async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateUserStatus = async (req, res) => {
    const { is_active } = req.body;
    try {
        await db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateUser = async (req, res) => {
    const { username, name, role, unitId, password } = req.body;
    try {
        // If password is provided, hash it
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query('UPDATE users SET username = ?, name = ?, role = ?, unitId = ?, password = ? WHERE id = ?',
                [username, name, role, unitId || null, hashedPassword, req.params.id]);
        } else {
            // Update without changing password
            await db.query('UPDATE users SET username = ?, name = ?, role = ?, unitId = ? WHERE id = ?',
                [username, name, role, unitId || null, req.params.id]);
        }
        res.json({ message: 'User updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateUserProfile = async (req, res) => {
    const { name, password } = req.body;
    try {
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query('UPDATE users SET name = ?, password = ? WHERE id = ?',
                [name, hashedPassword, req.params.id]);
        } else {
            await db.query('UPDATE users SET name = ? WHERE id = ?',
                [name, req.params.id]);
        }
        res.json({ message: 'Profile updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

