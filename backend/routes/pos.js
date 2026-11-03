const express = require('express');
const router = express.Router();
const { createWalkInOrder } = require('../controllers/pos');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

// the cashier's point-of-sale: staff and admin only
router.post('/pos/orders', isAuthenticatedUser, authorizeRoles('staff', 'admin'), createWalkInOrder);

module.exports = router;