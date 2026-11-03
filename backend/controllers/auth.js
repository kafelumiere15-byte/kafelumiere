const User = require('../models/user');
const sendToken = require('../utils/jwtToken');

// POST /api/v1/register  (public - always creates a CUSTOMER)
exports.registerUser = async (req, res, next) => {
    const { name, email, password, confirmPassword, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Please enter name, email and password' })
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' })
    }

    // Prevent duplicate accounts with the same email
    const existing = await User.findOne({ email: String(email).toLowerCase().trim() })
    if (existing) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' })
    }

    // NOTE: role is never taken from the request body -> nobody can self-register as admin/staff
    const user = await User.create({ name, email, password, phone: phone || undefined, role: 'customer' })

    return sendToken(user, 201, res)
}

// POST /api/v1/login  (customer, staff and admin all use this)
exports.loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please enter email & password' })
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password')
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }
    if (!user.password) {
        return res.status(400).json({ success: false, message: 'This account signs in with Google. Please use "Continue with Google"' })
    }

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact the shop admin' })
    }

    return sendToken(user, 200, res)
}

// POST /api/v1/logout
// JWT is stateless, so the real logout is the client deleting its token.
exports.logoutUser = async (req, res, next) => {
    return res.status(200).json({ success: true, message: 'Logged out' })
}

// GET /api/v1/me
exports.getUserProfile = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    return res.status(200).json({ success: true, user })
}

// PUT /api/v1/me/update  (only selected fields: name, phone - never email or role)
exports.updateProfile = async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (req.body.name !== undefined) user.name = req.body.name
    if (req.body.phone !== undefined) user.phone = req.body.phone

    await user.save()   // runs the schema validators

    return res.status(200).json({ success: true, user })
}

// PUT /api/v1/password/update
exports.updatePassword = async (req, res, next) => {
    const { oldPassword, password } = req.body;
    if (!oldPassword || !password) {
        return res.status(400).json({ success: false, message: 'Please enter your old and new password' })
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user.password) {
        return res.status(400).json({ success: false, message: 'This account signs in with Google, so it has no password to change' })
    }
    const isMatched = await user.comparePassword(oldPassword)
    if (!isMatched) {
        return res.status(400).json({ success: false, message: 'Old password is incorrect' })
    }

    user.password = password;
    await user.save();

    return sendToken(user, 200, res)
}

// POST /api/v1/auth/firebase   { idToken }   Google sign-in (the frontend gets the token from Firebase Auth,
// after @react-oauth/google's button hands it a Google ID token that gets turned into a Firebase credential).
// The token is checked with Google's identity service (accounts:lookup) using the Firebase Web API key.
exports.firebaseLogin = async (req, res, next) => {
    const idToken = req.body.idToken;
    if (!idToken) {
        return res.status(400).json({ success: false, message: 'Missing sign-in token' })
    }
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ success: false, message: 'Social sign-in is not configured on the server (FIREBASE_WEB_API_KEY)' })
    }

    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    })
    const info = await lookup.json().catch(() => ({}))
    const account = info.users && info.users[0]
    if (!lookup.ok || !account) {
        return res.status(401).json({ success: false, message: 'Sign-in could not be verified. Please try again' })
    }

    const providerInfo = (account.providerUserInfo && account.providerUserInfo[0]) || {};

    const email = String(account.email || providerInfo.email || '').toLowerCase().trim()
    if (!email) {
        return res.status(401).json({ success: false, message: 'Please sign in with a Google account that has an email address' })
    }
    if (!account.emailVerified) {
        return res.status(401).json({ success: false, message: 'Please sign in with a verified Google account' })
    }

    let user = await User.findOne({ email })
    if (!user) {
        // new people who sign in with Google become customers (same rule as normal registration)
        const name = String(account.displayName || providerInfo.displayName || email.split('@')[0]).trim().slice(0, 30) || 'Customer'
        user = await User.create({ name, email, authProvider: 'google', role: 'customer' })
    }
    if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact the shop admin' })
    }

    return sendToken(user, 200, res)
}