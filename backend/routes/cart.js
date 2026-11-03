const express = require('express');
const router = express.Router();
const { getCart, addItem, updateItem, removeItem, clearCart } = require('../controllers/cart');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

// the cart belongs to customers only (staff use the POS, admins manage the shop)
const customerOnly = [isAuthenticatedUser, authorizeRoles('customer')];

router.route('/cart')
    .get(customerOnly, getCart)
    .delete(customerOnly, clearCart);
router.post('/cart/items', customerOnly, addItem);
router.route('/cart/items/:productId')
    .put(customerOnly, updateItem)
    .delete(customerOnly, removeItem);

module.exports = router;