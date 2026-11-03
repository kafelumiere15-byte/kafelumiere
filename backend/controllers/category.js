const Category = require('../models/category');
const Product = require('../models/product');
const escapeRegex = require('../utils/escapeRegex');

// case-insensitive duplicate check ("Coffee" == "coffee")
const nameTaken = async (name, ignoreId) => {
    const filter = { name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') };
    if (ignoreId) filter._id = { $ne: ignoreId };
    return await Category.findOne(filter);
};

// GET /api/v1/categories  (public - active only)
exports.getCategories = async (req, res) => {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    return res.status(200).json({ success: true, count: categories.length, categories });
};

// GET /api/v1/admin/categories  (admin - all, with product counts)
exports.adminGetCategories = async (req, res) => {
    const categories = await Category.find().sort({ name: 1 });
    const withCounts = await Promise.all(categories.map(async (c) => ({
        ...c.toObject(),
        productCount: await Product.countDocuments({ category: c._id })
    })));
    return res.status(200).json({ success: true, count: withCounts.length, categories: withCounts });
};

// POST /api/v1/admin/category
exports.createCategory = async (req, res) => {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Please enter the category name' });
    }
    if (await nameTaken(name)) {
        return res.status(409).json({ success: false, message: 'A category with this name already exists' });
    }
    const category = await Category.create({ name, description });
    return res.status(201).json({ success: true, category });
};

// PUT /api/v1/admin/category/:id  (name, description, isActive)
exports.updateCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, isActive } = req.body;
    if (name !== undefined) {
        if (!String(name).trim()) {
            return res.status(400).json({ success: false, message: 'Please enter the category name' });
        }
        if (await nameTaken(String(name), category._id)) {
            return res.status(409).json({ success: false, message: 'A category with this name already exists' });
        }
        category.name = name;
    }
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    return res.status(200).json({ success: true, category });
};

// DELETE /api/v1/admin/category/:id  (only if it has no products)
exports.deleteCategory = async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
    }
    const count = await Product.countDocuments({ category: category._id });
    if (count > 0) {
        return res.status(409).json({
            success: false,
            message: `This category still has ${count} product(s). Move or delete them first, or deactivate the category instead`
        });
    }
    await category.deleteOne();
    return res.status(200).json({ success: true, message: 'Category deleted' });
};