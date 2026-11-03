const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/admin');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.get('/admin/stats', isAuthenticatedUser, authorizeRoles('admin'), getStats);

module.exports = router;