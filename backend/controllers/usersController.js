const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = users[0];

        // 1. Password Verification (with auto-hash upgrade)
        let isMatch = false;
        if (user.password.startsWith('$2')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else if (user.password === password) {
            // Legacy plain text match -> Upgrade to Hash
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
            isMatch = true;
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Hubungi Admin.' });
        }

        // 2. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, unitId: user.unitId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return user info + token
        const { password: _, ...userWithoutPassword } = user;
        res.json({ ...userWithoutPassword, token });

    } catch (err) { res.status(500).json({ error: err.message }); }
};

// Public Registration (Sign Up)
exports.registerPublic = async (req, res) => {
    const { username, password, name, role, unitId } = req.body;

    // Basic validation
    if (!username || !password || !name || !role) {
        return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    try {
        // Check username uniqueness
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username sudah digunakan' });
        }

        const id = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Security: Force role limitations if needed (e.g., prevent creating ADMIN via public API)
        if (role === 'ADMIN') {
            return res.status(403).json({ error: 'Role ADMIN tidak dapat didaftarkan secara publik.' });
        }

        await db.query(
            'INSERT INTO users (id, username, password, name, role, unitId) VALUES (?, ?, ?, ?, ?, ?)',
            [id, username, hashedPassword, name, role, unitId || null]
        );

        res.status(201).json({ message: 'Registrasi berhasil. Silakan login.', userId: id });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, name, role, unitId, is_active FROM users');
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
