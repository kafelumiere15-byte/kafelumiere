const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// One User collection for all three roles (Customer / Staff / Admin)
const ROLES = ['customer', 'staff', 'admin'];

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name'],
        trim: true,
        maxLength: [30, 'Your name cannot exceed 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'Please enter a valid email address']
    },
    password: {
        type: String,
        // Google sign-in accounts have no password of their own
        required: [function () { return this.authProvider === 'local'; }, 'Please enter your password'],
        minlength: [6, 'Your password must be at least 6 characters'],
        select: false
    },
    // how the account was created: a normal password ("local") or Google sign-in ("google")
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    phone: {
        type: String,
        trim: true,
        validate: {
            validator: v => !v || /^(09|\+639)\d{9}$/.test(v),
            message: 'Please enter a valid PH mobile number (e.g. 09171234567)'
        }
    },
    role: {
        type: String,
        enum: { values: ROLES, message: 'Role must be customer, staff, or admin' },
        default: 'customer'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    this.password = await bcrypt.hash(this.password, 10)
});

userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME
    });
}

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password)
}

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;