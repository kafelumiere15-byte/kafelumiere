const express = require('express');
const router = express.Router();
const { salesReport, summary, transactions } = require('../controllers/report');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const adminOnly = [isAuthenticatedUser, authorizeRoles('admin')];

router.get('/admin/reports/summary', adminOnly, summary);
router.get('/admin/reports/sales', adminOnly, salesReport);
router.get('/admin/reports/transactions', adminOnly, transactions);

module.exports = router;