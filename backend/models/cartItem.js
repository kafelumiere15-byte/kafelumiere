const mongoose = require('mongoose');
const { MAX_PER_ITEM } = require('../utils/cart');

// One record per (customer, product) line of a cart.
// Only ids + quantity are stored; prices always come from the Product collection, so they are current.
// Separate records (instead of one big array) let us change a quantity in ONE atomic step,
// so fast double-clicks can never overwrite each other.
const cartItemSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
        max: [MAX_PER_ITEM, `You can order up to ${MAX_PER_ITEM} of the same item`],
        validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// a customer can have each product only once in the cart (a second add increases the quantity)
cartItemSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('CartItem', cartItemSchema);