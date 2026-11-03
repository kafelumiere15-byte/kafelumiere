const express = require('express');
const router = express.Router();
const { getPaymentMethods, createOrder, getMyOrders, getOrder, getReceipt, listOrders, updateOrderStatus, recordPayment } = require('../controllers/order');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

router.get('/payment-methods', getPaymentMethods);                                        // public
router.post('/orders', isAuthenticatedUser, authorizeRoles('customer'), createOrder);     // customers place orders
// "mine" must be declared BEFORE "/orders/:id", otherwise Express would treat the word "mine" as an id
router.get('/orders/mine', isAuthenticatedUser, authorizeRoles('customer'), getMyOrders);  // my order history
router.get('/orders/:id', isAuthenticatedUser, getOrder);                                 // owner / staff / admin
router.get('/orders/:id/receipt', isAuthenticatedUser, getReceipt);                      // PDF receipt (owner / staff / admin)

// staff (and admin) work the order queue
const staffOrAdmin = [isAuthenticatedUser, authorizeRoles('staff', 'admin')];
router.get('/orders', staffOrAdmin, listOrders);                                          // the queue, search, tabs
router.put('/orders/:id/status', staffOrAdmin, updateOrderStatus);                        // confirm / next step / cancel
router.put('/orders/:id/payment', staffOrAdmin, recordPayment);                           // take the customer's payment

module.exports = router;