const Product = require('../models/product');
const Category = require('../models/category');
const Order = require('../models/order');

// GET /api/v1/admin/stats   (more numbers - orders, sales - are added in later parts)
exports.getStats = async (req, res) => {
    const [totalProducts, activeProducts, totalCategories, pendingOrders, completedOrders] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ isActive: true }),
        Category.countDocuments(),
        Order.countDocuments({ status: 'Pending' }),
        Order.countDocuments({ status: 'Completed' }),
    ]);
    return res.status(200).json({
        success: true,
        stats: { totalProducts, activeProducts, totalCategories, pendingOrders, completedOrders },
    });
};