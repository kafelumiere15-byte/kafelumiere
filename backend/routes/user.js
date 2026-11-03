const express = require('express');
const router = express.Router();
const { listUsers, getUser, createStaff, updateUser } = require('../controllers/user');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const adminOnly = [isAuthenticatedUser, authorizeRoles('admin')];

router.route('/admin/users')
    .get(adminOnly, listUsers)
    .post(adminOnly, createStaff);
router.route('/admin/users/:id')
    .get(adminOnly, getUser)
    .put(adminOnly, updateUser);

module.exports = router;