const express = require('express');
const router = express.Router();
const { getCategories, adminGetCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/category');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const adminOnly = [isAuthenticatedUser, authorizeRoles('admin')];

router.get('/categories', getCategories);                         // public

router.get('/admin/categories', adminOnly, adminGetCategories);
router.post('/admin/category', adminOnly, createCategory);
router.route('/admin/category/:id')
    .put(adminOnly, updateCategory)
    .delete(adminOnly, deleteCategory);

module.exports = router;