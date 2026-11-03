const mongoose = require('mongoose');
const CartItem = require('../models/cartItem');
const Product = require('../models/product');
const { MAX_PER_ITEM, isOrderable, buildCartView } = require('../utils/cart');

// Adds `qty` of a product to the customer's cart. Every step is a single atomic database
// operation, so clicks that arrive at the same moment can never overwrite each other.
const addToLine = async (userId, productId, qty) => {
    for (let attempt = 0; attempt < 5; attempt++) {
        // 1) line exists and still has room under the limit -> add in one atomic step
        const bumped = await CartItem.updateOne(
            { user: userId, product: productId, quantity: { $lte: MAX_PER_ITEM - qty } },
            { $inc: { quantity: qty } }
        );
        if (bumped.matchedCount === 1) return {};

        // 2) the line exists but there is no room left
        const existing = await CartItem.findOne({ user: userId, product: productId });
        if (existing) {
            if (existing.quantity + qty > MAX_PER_ITEM) {
                return { status: 400, message: `You can order up to ${MAX_PER_ITEM} of the same item (you already have ${existing.quantity} in your cart)` };
            }
            continue;   // it appeared a moment ago (another click) - try step 1 again
        }

        // 3) first time this product goes in the cart
        try {
            await CartItem.create({ user: userId, product: productId, quantity: qty });
            return {};
        } catch (err) {
            if (err.code === 11000) continue;   // another click created it first - try step 1 again
            throw err;
        }
    }
    throw new Error('Could not update your cart. Please try again');
};

const parseQuantity = (value) => {
    const qty = Number(value);
    if (value === '' || value === null || !Number.isInteger(qty) || qty < 1) {
        return { error: 'Quantity must be a whole number of at least 1' };
    }
    if (qty > MAX_PER_ITEM) {
        return { error: `You can order up to ${MAX_PER_ITEM} of the same item` };
    }
    return { qty };
};

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Loads the customer's lines + the live products, drops lines whose product was deleted,
// and sends the cart screen data (current prices, availability, subtotal, total).
const sendCart = async (res, userId) => {
    const items = await CartItem.find({ user: userId }).sort({ createdAt: 1, _id: 1 });
    const ids = items.map(i => i.product);
    const products = ids.length
        ? await Product.find({ _id: { $in: ids } }).populate('category', 'name isActive')
        : [];
    const byId = new Map(products.map(p => [String(p._id), p]));

    const missing = items.filter(i => !byId.has(String(i.product)));
    if (missing.length > 0) {
        await CartItem.deleteMany({ _id: { $in: missing.map(m => m._id) } });
    }
    const live = items.filter(i => byId.has(String(i.product)));

    return res.status(200).json({ success: true, cart: buildCartView(live, byId), removedCount: missing.length });
};

// GET /api/v1/cart
exports.getCart = async (req, res) => {
    return sendCart(res, req.user._id);
};

// POST /api/v1/cart/items   { productId, quantity = 1 }   (adds on top of what is already there)
exports.addItem = async (req, res) => {
    const { productId } = req.body;
    const quantity = req.body.quantity === undefined ? 1 : req.body.quantity;

    if (!productId || !mongoose.isValidObjectId(productId)) {
        return fail(res, 400, 'Please choose a valid product');
    }
    const parsed = parseQuantity(quantity);
    if (parsed.error) {
        return fail(res, 400, parsed.error);
    }

    const product = await Product.findById(productId).populate('category', 'name isActive');
    if (!product || !product.isActive || !product.category || !product.category.isActive) {
        return fail(res, 404, 'This item is not on the menu');
    }
    if (!product.isAvailable) {
        return fail(res, 400, `${product.name} is currently sold out`);
    }

    const userId = req.user._id;
    const result = await addToLine(userId, product._id, parsed.qty);

    if (result.message) return fail(res, result.status, result.message);
    return sendCart(res, userId);
};

// PUT /api/v1/cart/items/:productId   { quantity }   (sets the quantity)
exports.updateItem = async (req, res) => {
    const parsed = parseQuantity(req.body.quantity);
    if (parsed.error) {
        return fail(res, 400, parsed.error);
    }

    const { productId } = req.params;
    const userId = req.user._id;
    const line = mongoose.isValidObjectId(productId)
        ? await CartItem.findOne({ user: userId, product: productId })
        : null;
    if (!line) {
        return fail(res, 404, 'This item is not in your cart');
    }

    const product = await Product.findById(productId).populate('category', 'name isActive');
    if (!isOrderable(product)) {
        return fail(res, 400, 'This item is no longer available. Please remove it from your cart');
    }

    await CartItem.updateOne({ _id: line._id }, { $set: { quantity: parsed.qty } });
    return sendCart(res, userId);
};

// DELETE /api/v1/cart/items/:productId
exports.removeItem = async (req, res) => {
    const { productId } = req.params;
    const removed = mongoose.isValidObjectId(productId)
        ? await CartItem.deleteOne({ user: req.user._id, product: productId })
        : { deletedCount: 0 };
    if (removed.deletedCount === 0) {
        return fail(res, 404, 'This item is not in your cart');
    }
    return sendCart(res, req.user._id);
};

// DELETE /api/v1/cart   (empty the whole cart)
exports.clearCart = async (req, res) => {
    await CartItem.deleteMany({ user: req.user._id });
    return sendCart(res, req.user._id);
};