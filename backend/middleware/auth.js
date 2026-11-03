const User = require('../models/user')
const jwt = require('jsonwebtoken')

// Verifies the "Authorization: Bearer <token>" header and loads req.user
exports.isAuthenticatedUser = async (req, res, next) => {
    const header = req.header('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Login first to access this resource' })
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Your session is invalid or has expired. Please log in again' })
    }

    const user = await User.findById(decoded.id);
    if (!user) {
        return res.status(401).json({ success: false, message: 'User no longer exists' })
    }
    if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact the shop admin' })
    }

    req.user = user;
    next()
};

// Role-based access: authorizeRoles('admin'), authorizeRoles('admin', 'staff'), ...
exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: `Role (${req.user.role}) is not allowed to access this resource` })
        }
        next()
    }
}
