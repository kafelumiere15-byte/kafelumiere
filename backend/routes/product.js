const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
    getProducts, getProduct, getProductReviews, getMyReview, saveReview,
    adminGetProducts, adminGetProduct, createProduct, updateProduct, deleteProduct,
    bulkDeleteProducts, deleteReview
} = require('../controllers/product');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const adminOnly = [isAuthenticatedUser, authorizeRoles('admin')];
const customerOnly = [isAuthenticatedUser, authorizeRoles('customer')];

// ---- public
router.get('/products', getProducts);                              // filters, sort, pagination
router.get('/products/:id', getProduct);                           // one product + its reviews
router.get('/products/:id/reviews', getProductReviews);            // reviews of one product

// ---- customers who completed an order for the product
router.get('/products/:id/review/mine', customerOnly, getMyReview);
router.route('/products/:id/reviews')
    .post(customerOnly, saveReview)                                // create or update own review
    .put(customerOnly, saveReview);

// ---- admin
router.get('/admin/products', adminOnly, adminGetProducts);
// auth first, THEN upload - so strangers can't write files to the server
router.post('/admin/product', adminOnly, upload, createProduct);
router.post('/admin/products/bulk-delete', adminOnly, bulkDeleteProducts);
router.route('/admin/product/:id')
    .get(adminOnly, adminGetProduct)
    .put(adminOnly, upload, updateProduct)
    .delete(adminOnly, deleteProduct);
router.delete('/admin/product/:id/reviews/:reviewId', adminOnly, deleteReview);

module.exports = router;
