const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'steritrack-secret-fallback-dev';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    // 1. Get token from header
    const authHeader = req.headers['authorization'];

    // Format: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access Denied: No Token Provided' });
    }

    try {
        // 2. Verify token
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Attach user info to request
        next(); // Proceed to next middleware/route
    } catch (err) {
        res.status(401).json({ error: 'Invalid Token' });
    }
};

module.exports = verifyToken;
