const mongoose = require('mongoose');
const User = require('../models/user');
const { ROLES } = require('../models/user');
const escapeRegex = require('../utils/escapeRegex');

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// anything that is not a positive whole number falls back to the default
const positive = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

// never send the password hash anywhere
const safe = (user) => {
    const obj = user.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

// GET /api/v1/admin/users?role=&status=active|inactive&q=&page=1&limit=10   (admin)
exports.listUsers = async (req, res) => {
    const page = positive(req.query.page, 1);
    const limit = Math.min(50, positive(req.query.limit, 10));
    const { role, status } = req.query;
    const q = req.query.q ? String(req.query.q).trim() : '';

    const filter = {};
    if (ROLES.includes(role)) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (q) {
        const re = new RegExp(escapeRegex(q), 'i');
        filter.$or = [{ name: re }, { email: re }, { phone: re }];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    // numbers for the tabs (everybody, not affected by the search box)
    const [all, customer, staff, admin, inactive] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: 'customer' }),
        User.countDocuments({ role: 'staff' }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ isActive: false }),
    ]);

    return res.status(200).json({
        success: true,
        users: users.map(safe),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        counts: { all, customer, staff, admin, inactive },
    });
};

// GET /api/v1/admin/users/:id   (admin)
exports.getUser = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return fail(res, 404, 'User not found');
    }
    const user = await User.findById(req.params.id);
    if (!user) {
        return fail(res, 404, 'User not found');
    }
    return res.status(200).json({ success: true, user: safe(user) });
};

// POST /api/v1/admin/users   { name, email, password, phone }   (admin) - adds a STAFF account
// The role is always "staff". Making someone an admin is a separate, deliberate step (PUT ... role).
exports.createStaff = async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
        return fail(res, 400, 'Please enter the name, email and a password for the new staff member');
    }
    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
        return fail(res, 409, 'An account with this email already exists');
    }

    const user = await User.create({ name, email, password, phone: phone || undefined, role: 'staff' });
    return res.status(201).json({ success: true, user: safe(user) });
};

// PUT /api/v1/admin/users/:id   { name, phone, role, isActive }   (admin)
// The e-mail address is the account's identity and cannot be changed here.
exports.updateUser = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return fail(res, 404, 'User not found');
    }
    const user = await User.findById(req.params.id);
    if (!user) {
        return fail(res, 404, 'User not found');
    }

    const { name, phone, role, isActive } = req.body;
    const isSelf = String(user._id) === String(req.user._id);

    if (role !== undefined && role !== user.role) {
        if (!ROLES.includes(role)) {
            return fail(res, 400, 'Role must be customer, staff, or admin');
        }
        if (isSelf) {
            return fail(res, 403, 'You cannot change your own role');
        }
        user.role = role;
    }

    if (isActive !== undefined) {
        const active = isActive === true || isActive === 'true' ? true : isActive === false || isActive === 'false' ? false : null;
        if (active === null) {
            return fail(res, 400, 'Please choose active or inactive');
        }
        if (isSelf && !active) {
            return fail(res, 403, 'You cannot deactivate your own account');
        }
        user.isActive = active;
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();   // runs the same checks as registration
    return res.status(200).json({ success: true, user: safe(user) });
};