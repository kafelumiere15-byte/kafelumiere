const mongoose = require('mongoose');
const Product = require('../models/product');
const Category = require('../models/category');
const Order = require('../models/order');
const escapeRegex = require('../utils/escapeRegex');
const maskBadWords = require('../utils/badWords');
const recalcRatings = require('../utils/productRating');
const { removeMulterFiles, removeProductImages } = require('../utils/files');

const OBJECT_ID = /^[a-f\d]{24}$/i;

// one saved photo (multer already wrote the file to uploads/products)
const imageFromFile = (file) => ({ filename: file.filename, url: `/uploads/products/${file.filename}` });

const isTrue = (v) => v === true || v === 'true' || v === '1' || v === 'on';

// "removeImages" can arrive as a JSON array string (multipart) or as an array (JSON)
const parseList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [String(value)];
    } catch {
        return [String(value)];
    }
};

const keywordFilter = (keyword) => {
    const re = new RegExp(escapeRegex(String(keyword).trim()), 'i');
    return { $or: [{ name: re }, { description: re }] };
};

// a number from the query string, or undefined when it is missing / not a number
const numberOrUndefined = (value) => {
    if (value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
};

const positive = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

// the menu sort options (the value is what the frontend sends as ?sort=)
const SORTS = {
    'name': { name: 1 },
    'price-asc': { price: 1, name: 1 },
    'price-desc': { price: -1, name: 1 },
    'rating': { ratings: -1, numOfReviews: -1, name: 1 },
    'newest': { createdAt: -1 },
};

// every product sent to the frontend has an "images" array (older products only had the single "image")
const toClient = (product) => {
    const obj = product.toObject ? product.toObject() : { ...product };
    if (!obj.images || obj.images.length === 0) {
        obj.images = obj.image && obj.image.url ? [obj.image] : [];
    }
    return obj;
};

// newest reviews first
const sortReviews = (reviews = []) =>
    [...reviews].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

// when something fails after multer saved the photos, delete them so we don't leave orphan files
const fail = (req, res, status, message) => {
    removeMulterFiles(req.files);
    return res.status(status).json({ success: false, message });
};

// a customer may review an item only after an order containing it was completed
const hasCompletedOrder = (userId, productId) =>
    Order.exists({ user: userId, status: 'Completed', 'items.product': productId });

// ------------------------------------------------------------------ PUBLIC

// GET /api/v1/products?keyword=&category=&minPrice=&maxPrice=&minRating=&minReviews=&sort=&page=&limit=
// Only active products in active categories. Without "limit" every match is returned (the menu page).
exports.getProducts = async (req, res) => {
    const q = req.query;

    const activeCategories = await Category.find({ isActive: true }).select('_id');
    let categoryIds = activeCategories.map(c => c._id);
    if (q.category) {
        categoryIds = mongoose.isValidObjectId(q.category)
            ? categoryIds.filter(id => String(id) === String(q.category))
            : [];
    }

    const filter = { isActive: true, category: { $in: categoryIds } };
    if (q.keyword && String(q.keyword).trim()) Object.assign(filter, keywordFilter(q.keyword));

    // price filter
    const minPrice = numberOrUndefined(q.minPrice);
    const maxPrice = numberOrUndefined(q.maxPrice);
    if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice !== undefined) filter.price.$gte = minPrice;
        if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    // ratings filter: average rating of at least N stars
    const minRating = numberOrUndefined(q.minRating);
    if (minRating !== undefined && minRating > 0) filter.ratings = { $gte: minRating };

    // reviews filter: at least N reviews
    const minReviews = numberOrUndefined(q.minReviews);
    if (minReviews !== undefined && minReviews > 0) filter.numOfReviews = { $gte: Math.floor(minReviews) };

    const sort = SORTS[q.sort] || SORTS.name;
    const count = await Product.countDocuments(filter);

    let query = Product.find(filter).select('-reviews').populate('category', 'name').sort(sort);
    let page = 1;
    let limit = count;
    let pages = 1;

    const requestedLimit = parseInt(q.limit, 10);
    if (Number.isInteger(requestedLimit) && requestedLimit > 0) {
        limit = Math.min(requestedLimit, 50);
        page = positive(q.page, 1);
        pages = Math.max(1, Math.ceil(count / limit));
        query = query.skip((page - 1) * limit).limit(limit);
    }

    const products = await query;
    return res.status(200).json({
        success: true,
        count,
        products: products.map(toClient),
        page,
        pages,
        limit,
    });
};

// GET /api/v1/products/:id   (includes the reviews, newest first)
exports.getProduct = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) {
        return fail(req, res, 404, 'Product not found');
    }
    const product = await Product.findById(req.params.id).populate('category', 'name isActive');
    if (!product || !product.isActive || !product.category || !product.category.isActive) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const obj = toClient(product);
    obj.reviews = sortReviews(obj.reviews);
    return res.status(200).json({ success: true, product: obj });
};

// GET /api/v1/products/:id/reviews
exports.getProductReviews = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const product = await Product.findById(req.params.id).select('reviews ratings numOfReviews isActive');
    if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(200).json({
        success: true,
        reviews: sortReviews(product.toObject().reviews),
        ratings: product.ratings,
        numOfReviews: product.numOfReviews,
    });
};

// ------------------------------------------------------------------ CUSTOMER (reviews)

// GET /api/v1/products/:id/review/mine   -> { canReview, review }
exports.getMyReview = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const product = await Product.findById(req.params.id).select('reviews isActive');
    if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const mine = product.reviews.find(r => String(r.user) === String(req.user._id));
    const canReview = Boolean(await hasCompletedOrder(req.user._id, product._id));
    return res.status(200).json({
        success: true,
        canReview,
        review: mine ? mine.toObject() : null,
    });
};

// POST (or PUT) /api/v1/products/:id/reviews   { rating: 1-5, comment }
// Creates the review, or UPDATES the customer's own review. Bad words in the comment are masked.
exports.saveReview = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const rating = Number(req.body.rating);
    const rawComment = req.body.comment === undefined || req.body.comment === null ? '' : String(req.body.comment).trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Please give between 1 and 5 stars' });
    }
    if (rawComment.length === 0) {
        return res.status(400).json({ success: false, message: 'Please write a comment' });
    }
    if (rawComment.length > 500) {
        return res.status(400).json({ success: false, message: 'Comment cannot exceed 500 characters' });
    }

    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (!(await hasCompletedOrder(req.user._id, product._id))) {
        return res.status(403).json({ success: false, message: 'You can review this item after you have completed an order for it' });
    }

    const comment = maskBadWords(rawComment);
    const mine = product.reviews.find(r => String(r.user) === String(req.user._id));
    let review;
    let updated = false;
    if (mine) {
        mine.rating = rating;
        mine.comment = comment;
        mine.name = req.user.name;
        mine.updatedAt = new Date();
        review = mine;
        updated = true;
    } else {
        product.reviews.push({ user: req.user._id, name: req.user.name, rating, comment });
        review = product.reviews[product.reviews.length - 1];
    }

    recalcRatings(product);
    await product.save({ validateBeforeSave: false });   // the review was validated above

    return res.status(200).json({
        success: true,
        review: review.toObject(),
        updated,
        ratings: product.ratings,
        numOfReviews: product.numOfReviews,
    });
};

// ------------------------------------------------------------------ ADMIN

// GET /api/v1/admin/products?keyword=&category=&status=active|inactive   (all products, no reviews list)
exports.adminGetProducts = async (req, res) => {
    const filter = {};
    if (req.query.category && mongoose.isValidObjectId(req.query.category)) filter.category = req.query.category;
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.keyword && String(req.query.keyword).trim()) {
        Object.assign(filter, keywordFilter(req.query.keyword));
    }

    const products = await Product.find(filter).select('-reviews').populate('category', 'name isActive').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: products.length, products: products.map(toClient) });
};

// GET /api/v1/admin/product/:id
exports.adminGetProduct = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const product = await Product.findById(req.params.id).populate('category', 'name isActive');
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const obj = toClient(product);
    obj.reviews = sortReviews(obj.reviews);
    return res.status(200).json({ success: true, product: obj });
};

// POST /api/v1/admin/product   (multipart/form-data; photos in the field "images", up to 5)
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, category, isAvailable, isActive } = req.body;

        if (!name || !String(name).trim() || price === undefined || price === '' || !category) {
            return fail(req, res, 400, 'Please enter the product name, price and category');
        }
        const cat = mongoose.isValidObjectId(category) ? await Category.findById(category) : null;
        if (!cat) {
            return fail(req, res, 400, 'The selected category does not exist');
        }

        const product = await Product.create({
            name, description, price, category, isAvailable, isActive,
            images: (req.files || []).map(imageFromFile)
        });
        return res.status(201).json({ success: true, product: toClient(product) });
    } catch (err) {
        removeMulterFiles(req.files);
        throw err;   // Express 5 sends it to the error middleware
    }
};

// PUT /api/v1/admin/product/:id   (multipart or JSON; send only what changed)
//   images         new photos are added to the product
//   removeImages   JSON array of photo urls to delete, e.g. ["/uploads/products/abc.jpg"]
exports.updateProduct = async (req, res) => {
    try {
        if (!OBJECT_ID.test(req.params.id)) {
            return fail(req, res, 404, 'Product not found');
        }
        const product = await Product.findById(req.params.id);
        if (!product) {
            return fail(req, res, 404, 'Product not found');
        }

        const { name, description, price, category, isAvailable, isActive } = req.body;

        if (name !== undefined) {
            if (!String(name).trim()) return fail(req, res, 400, 'Please enter the product name');
            product.name = name;
        }
        if (description !== undefined) product.description = description;
        if (price !== undefined) {
            if (price === '') return fail(req, res, 400, 'Please enter the product price');
            product.price = price;
        }
        if (category !== undefined && String(category) !== String(product.category)) {
            const cat = mongoose.isValidObjectId(category) ? await Category.findById(category) : null;
            if (!cat) return fail(req, res, 400, 'The selected category does not exist');
            product.category = category;
        }
        if (isAvailable !== undefined) product.isAvailable = isAvailable;
        if (isActive !== undefined) product.isActive = isActive;

        // photos: start from the current ones (a legacy single photo counts as one), drop the removed ones, add the new ones
        const current = toClient(product).images;
        const toRemove = parseList(req.body.removeImages);
        const kept = current.filter(img => !toRemove.includes(img.url));
        const removed = current.filter(img => toRemove.includes(img.url));
        const added = (req.files || []).map(imageFromFile);

        // no limit on how many photos a product can have
        product.images = [...kept, ...added].map(img => ({ filename: img.filename, url: img.url }));
        product.set('image', undefined);   // the legacy single photo now lives in "images"

        await product.save();

        // only delete the files once the save succeeded
        removeProductImages(removed);

        return res.status(200).json({ success: true, product: toClient(product) });
    } catch (err) {
        removeMulterFiles(req.files);
        throw err;
    }
};

// DELETE /api/v1/admin/product/:id
exports.deleteProduct = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const images = toClient(product).images;
    await product.deleteOne();
    removeProductImages(images);
    return res.status(200).json({ success: true, message: 'Product deleted' });
};

// POST /api/v1/admin/products/bulk-delete   { ids: [...] }   (at most 100 at once)
exports.bulkDeleteProducts = async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    if (ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Please select at least one product' });
    }
    if (ids.length > 100) {
        return res.status(400).json({ success: false, message: 'You can delete at most 100 products at once' });
    }
    const validIds = ids.filter(id => OBJECT_ID.test(id));
    if (validIds.length === 0) {
        return res.status(400).json({ success: false, message: 'None of the selected products were found' });
    }

    const products = await Product.find({ _id: { $in: validIds } }).select('images image');
    const result = await Product.deleteMany({ _id: { $in: products.map(p => p._id) } });
    products.forEach(p => removeProductImages(toClient(p).images));

    return res.status(200).json({
        success: true,
        deleted: result.deletedCount,
        message: `${result.deletedCount} product(s) deleted`,
    });
};

// DELETE /api/v1/admin/product/:id/reviews/:reviewId   (admin removes any review)
exports.deleteReview = async (req, res) => {
    const { id, reviewId } = req.params;
    if (!OBJECT_ID.test(id) || !OBJECT_ID.test(reviewId)) {
        return res.status(404).json({ success: false, message: 'Review not found' });
    }
    const product = await Product.findById(id);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const target = product.reviews.id(reviewId);
    if (!target) {
        return res.status(404).json({ success: false, message: 'Review not found' });
    }
    product.reviews.pull({ _id: reviewId });
    recalcRatings(product);
    await product.save({ validateBeforeSave: false });

    return res.status(200).json({
        success: true,
        message: 'Review deleted',
        ratings: product.ratings,
        numOfReviews: product.numOfReviews,
    });
};