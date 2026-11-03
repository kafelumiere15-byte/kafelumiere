const mongoose = require('mongoose');
const { PAYMENT_METHOD_IDS } = require('../utils/payment');

// the order moves along this line (staff update it in Part 7); "Cancelled" can happen from most steps
const ORDER_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];
const ACTIVE_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup'];   // still being worked on
const PAST_STATUSES = ['Completed', 'Cancelled'];                                    // finished

// a COPY of what was bought: name and price are saved as they were at checkout,
// so later menu changes never rewrite old orders
const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    // online = placed by a customer, walk-in = typed in by the cashier (Part 8)
    source: {
        type: String,
        enum: ['online', 'walk-in'],
        default: 'online'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // copy of the customer's details at the time of the order (cashiers search by these)
    customer: {
        name: String,
        email: String,
        phone: String
    },
    items: {
        type: [orderItemSchema],
        validate: [(items) => items.length > 0, 'An order needs at least one item']
    },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
        type: String,
        enum: { values: PAYMENT_METHOD_IDS, message: 'Please choose a supported payment method' },
        required: [true, 'Please choose a payment method']
    },
    // unpaid -> paid (cashier recorded it) -> refunded (a PAID order was cancelled: give the money back)
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'refunded'],
        default: 'unpaid'
    },
    // filled in when the cashier records the payment
    amountTendered: { type: Number, min: 0 },     // money received (for cash this can be more than the total)
    change: { type: Number, min: 0 },             // change given back
    paymentReference: { type: String, trim: true, maxLength: 40 },   // e.g. GCash / Maya reference number
    paidAt: { type: Date },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ORDER_STATUSES,
        default: 'Pending'
    },
    // every status the order has been in, with the time (used for the tracking timeline)
    statusHistory: [{
        _id: false,
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    note: {
        type: String,
        trim: true,
        default: '',
        maxLength: [200, 'Note cannot exceed 200 characters']
    },
    // why the shop cancelled / rejected the order (the customer can read it)
    cancelReason: {
        type: String,
        trim: true,
        default: '',
        maxLength: [200, 'The reason cannot exceed 200 characters']
    },
    // when the order reached its final status (sales reports are grouped by these, not by the order date)
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, completedAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
module.exports.PAST_STATUSES = PAST_STATUSES;