const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access Denied: Requires one of roles [${allowedRoles.join(', ')}]` });
        }

        next();
    };
};

module.exports = roleMiddleware;
