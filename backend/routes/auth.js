const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    updateProfile,
    updatePassword,
    firebaseLogin,
} = require('../controllers/auth');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth')

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/auth/firebase', firebaseLogin);   // Google sign-in
router.post('/logout', logoutUser);
router.get('/me', isAuthenticatedUser, getUserProfile)
router.put('/me/update', isAuthenticatedUser, updateProfile)
router.put('/password/update', isAuthenticatedUser, updatePassword)

// Role-protected sample routes (used to prove RBAC works).
// They will be replaced by the real Admin / Staff modules in the next parts.
router.get('/admin/ping', isAuthenticatedUser, authorizeRoles('admin'), (req, res) => res.status(200).json({ success: true, message: 'Hello admin' }))
router.get('/staff/ping', isAuthenticatedUser, authorizeRoles('staff', 'admin'), (req, res) => res.status(200).json({ success: true, message: 'Hello staff' }))

module.exports = router;
